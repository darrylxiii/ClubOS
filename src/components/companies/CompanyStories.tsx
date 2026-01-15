import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Eye, Heart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface CompanyStory {
  id: string;
  company_id: string;
  created_by: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  expires_at: string;
  created_at: string;
  creator?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  views_count?: number;
  likes_count?: number;
  user_has_liked?: boolean;
  user_has_viewed?: boolean;
}

interface CompanyStoriesProps {
  companyId: string;
  isCompanyMember: boolean;
  onCreateStory: () => void;
}

export function CompanyStories({ companyId, isCompanyMember, onCreateStory }: CompanyStoriesProps) {
  const { user } = useAuth();
  const [stories, setStories] = useState<CompanyStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingStory, setViewingStory] = useState<CompanyStory | null>(null);

  useEffect(() => {
    fetchStories();
  }, [companyId]);

  const fetchStories = async () => {
    try {
      const { data: storiesData, error } = await supabase
        .from('company_stories')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!storiesData || storiesData.length === 0) {
        setStories([]);
        setLoading(false);
        return;
      }

      // OPTIMIZED: Batch fetch all engagement data in parallel
      const storyIds = storiesData.map(s => s.id);
      const creatorIds = [...new Set(storiesData.map(s => s.created_by))];

      const [creatorsData, viewsData, likesData, userViewsData, userLikesData] = await Promise.all([
        // Fetch all creators
        supabase.from('profiles').select('id, full_name, avatar_url').in('id', creatorIds),
        // Batch fetch all view counts
        supabase.from('company_story_views').select('story_id').in('story_id', storyIds),
        // Batch fetch all like counts
        supabase.from('company_story_likes').select('story_id').in('story_id', storyIds),
        // Fetch user's views (if logged in)
        user ? supabase.from('company_story_views').select('story_id').in('story_id', storyIds).eq('user_id', user.id) : Promise.resolve({ data: [] }),
        // Fetch user's likes (if logged in)
        user ? supabase.from('company_story_likes').select('story_id').in('story_id', storyIds).eq('user_id', user.id) : Promise.resolve({ data: [] }),
      ]);

      // Create lookup maps for O(1) access
      const creatorsMap = new Map(creatorsData.data?.map(c => [c.id, c]) || []);
      
      // Count views/likes per story
      const viewsCountMap = new Map<string, number>();
      const likesCountMap = new Map<string, number>();
      viewsData.data?.forEach(v => viewsCountMap.set(v.story_id, (viewsCountMap.get(v.story_id) || 0) + 1));
      likesData.data?.forEach(l => likesCountMap.set(l.story_id, (likesCountMap.get(l.story_id) || 0) + 1));
      
      // User interaction sets
      const userViewedSet = new Set(userViewsData.data?.map(v => v.story_id) || []);
      const userLikedSet = new Set(userLikesData.data?.map(l => l.story_id) || []);

      const enrichedStories = storiesData.map((story) => {
        const creator = creatorsMap.get(story.created_by) || { full_name: 'Unknown', avatar_url: null };
        return {
          ...story,
          creator,
          views_count: viewsCountMap.get(story.id) || 0,
          likes_count: likesCountMap.get(story.id) || 0,
          user_has_viewed: userViewedSet.has(story.id),
          user_has_liked: userLikedSet.has(story.id),
        };
      });

      setStories(enrichedStories);
    } catch (error) {
      console.error('Error fetching company stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStoryClick = async (story: CompanyStory) => {
    setViewingStory(story);
    
    if (user && !story.user_has_viewed) {
      await supabase.from('company_story_views').insert({
        story_id: story.id,
        user_id: user.id,
      });
      fetchStories();
    }
  };

  const handleLike = async (storyId: string, currentlyLiked: boolean) => {
    if (!user) {
      toast.error('Please sign in to like stories');
      return;
    }

    try {
      if (currentlyLiked) {
        await supabase
          .from('company_story_likes')
          .delete()
          .eq('story_id', storyId)
          .eq('user_id', user.id);
      } else {
        await supabase.from('company_story_likes').insert({
          story_id: storyId,
          user_id: user.id,
        });
      }
      fetchStories();
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading stories...</div>;
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {isCompanyMember && (
          <Card
            className="flex-shrink-0 w-24 h-32 flex flex-col items-center justify-center cursor-pointer hover:bg-accent transition-colors"
            onClick={onCreateStory}
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Plus className="h-8 w-8 text-primary" />
            </div>
            <span className="text-xs text-center">Add Story</span>
          </Card>
        )}

        {stories.map((story) => (
          <Card
            key={story.id}
            className="flex-shrink-0 w-24 h-32 relative cursor-pointer group overflow-hidden"
            onClick={() => handleStoryClick(story)}
          >
            <img
              src={story.media_url}
              alt="Story"
              className="w-full h-full object-cover"
              width={96}
              height={128}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-2 left-2 right-2">
              <Avatar className="h-8 w-8 border-2 border-white">
                <AvatarImage src={story.creator?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {story.creator?.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex gap-2 mt-1 text-xs text-white">
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {story.views_count}
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  {story.likes_count}
                </span>
              </div>
            </div>
            {!story.user_has_viewed && (
              <div className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            )}
          </Card>
        ))}

        {stories.length === 0 && !isCompanyMember && (
          <div className="text-muted-foreground text-sm">No active stories</div>
        )}
      </div>

      <Dialog open={!!viewingStory} onOpenChange={() => setViewingStory(null)}>
        <DialogContent className="max-w-2xl p-0">
          {viewingStory && (
            <div className="relative">
              {viewingStory.media_type === 'image' ? (
                <img
                  src={viewingStory.media_url}
                  alt="Story"
                  className="w-full max-h-[80vh] object-contain"
                />
              ) : (
                <video
                  src={viewingStory.media_url}
                  controls
                  className="w-full max-h-[80vh]"
                />
              )}
              {viewingStory.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-4">
                  {viewingStory.caption}
                </div>
              )}
              <div className="absolute top-4 right-4 flex gap-2">
                <Button
                  size="sm"
                  variant={viewingStory.user_has_liked ? 'default' : 'secondary'}
                  onClick={() => handleLike(viewingStory.id, viewingStory.user_has_liked || false)}
                >
                  <Heart className={`h-4 w-4 ${viewingStory.user_has_liked ? 'fill-current' : ''}`} />
                  {viewingStory.likes_count}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

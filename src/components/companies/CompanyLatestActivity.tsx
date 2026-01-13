import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { CompanyStories } from './CompanyStories';
import { CreateCompanyStoryDialog } from './CreateCompanyStoryDialog';
import { Heart, MessageCircle, Share2, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface CompanyLatestActivityProps {
  companyId: string;
  isCompanyMember: boolean;
}

interface CompanyPost {
  id: string;
  title: string;
  content: string;
  post_type: string;
  created_at: string;
  author: {
    full_name: string;
    avatar_url: string | null;
  };
  likes_count: number;
  comments_count: number;
  user_has_liked: boolean;
}

export function CompanyLatestActivity({ companyId, isCompanyMember }: CompanyLatestActivityProps) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CompanyPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [storyDialogOpen, setStoryDialogOpen] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, [companyId]);

  const fetchPosts = async () => {
    try {
      const { data: postsData, error } = await supabase
        .from('company_posts')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_public', true)
        .not('published_at', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (!postsData || postsData.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      // OPTIMIZED: Batch fetch all engagement data in parallel
      const postIds = postsData.map(p => p.id);
      const authorIds = [...new Set(postsData.map(p => p.author_id))];

      const [authorsData, likesData, commentsData, userLikesData] = await Promise.all([
        // Fetch all authors
        supabase.from('profiles').select('id, full_name, avatar_url').in('id', authorIds),
        // Batch fetch all like counts
        supabase.from('company_post_likes').select('post_id').in('post_id', postIds),
        // Batch fetch all comment counts
        supabase.from('company_post_comments').select('post_id').in('post_id', postIds),
        // Fetch user's likes (if logged in)
        user ? supabase.from('company_post_likes').select('post_id').in('post_id', postIds).eq('user_id', user.id) : Promise.resolve({ data: [] }),
      ]);

      // Create lookup maps for O(1) access
      const authorsMap = new Map(authorsData.data?.map(a => [a.id, a]) || []);
      
      // Count likes/comments per post
      const likesCountMap = new Map<string, number>();
      const commentsCountMap = new Map<string, number>();
      likesData.data?.forEach(l => likesCountMap.set(l.post_id, (likesCountMap.get(l.post_id) || 0) + 1));
      commentsData.data?.forEach(c => commentsCountMap.set(c.post_id, (commentsCountMap.get(c.post_id) || 0) + 1));
      
      // User liked set
      const userLikedSet = new Set(userLikesData.data?.map(l => l.post_id) || []);

      const enrichedPosts = postsData.map((post) => {
        const author = authorsMap.get(post.author_id) || { full_name: 'Unknown', avatar_url: null };
        return {
          ...post,
          author,
          likes_count: likesCountMap.get(post.id) || 0,
          comments_count: commentsCountMap.get(post.id) || 0,
          user_has_liked: userLikedSet.has(post.id),
        };
      });

      setPosts(enrichedPosts);
    } catch (error) {
      console.error('Error fetching company posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string, currentlyLiked: boolean) => {
    if (!user) {
      toast.error('Please sign in to like posts');
      return;
    }

    try {
      if (currentlyLiked) {
        await supabase
          .from('company_post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
      } else {
        await supabase.from('company_post_likes').insert({
          post_id: postId,
          user_id: user.id,
        });
      }
      fetchPosts();
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  return (
    <>
      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="posts" className="flex-1">Posts</TabsTrigger>
          <TabsTrigger value="stories" className="flex-1">Stories</TabsTrigger>
          <TabsTrigger value="activity" className="flex-1">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading posts...</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No posts yet</div>
          ) : (
            posts.map((post) => (
              <Card key={post.id} className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{post.title}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                    {post.post_type}
                  </span>
                </div>

                <p className="text-sm">{post.content}</p>

                <div className="flex gap-4 pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLike(post.id, post.user_has_liked)}
                    className="flex items-center gap-2"
                  >
                    <Heart className={`h-4 w-4 ${post.user_has_liked ? 'fill-current text-red-500' : ''}`} />
                    {post.likes_count}
                  </Button>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    {post.comments_count}
                  </Button>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="stories">
          <CompanyStories
            companyId={companyId}
            isCompanyMember={isCompanyMember}
            onCreateStory={() => setStoryDialogOpen(true)}
          />
        </TabsContent>

        <TabsContent value="activity">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Recent Activity</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                Activity timeline coming soon
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateCompanyStoryDialog
        companyId={companyId}
        open={storyDialogOpen}
        onOpenChange={setStoryDialogOpen}
        onStoryCreated={fetchPosts}
      />
    </>
  );
}

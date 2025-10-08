import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Heart, MessageCircle, Eye, Settings, Image as ImageIcon } from "lucide-react";
import { CreateCompanyStoryDialog } from "./CreateCompanyStoryDialog";
import { useNavigate } from "react-router-dom";

interface CompanySocialActivityProps {
  companyId: string;
  isCompanyMember: boolean;
}

interface CompanyPost {
  id: string;
  content: string;
  media_url?: string;
  created_at: string;
}

interface CompanyStory {
  id: string;
  media_url: string;
  media_type: string;
  created_at: string;
  views_count: number;
}

export function CompanySocialActivity({ companyId, isCompanyMember }: CompanySocialActivityProps) {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<CompanyPost[]>([]);
  const [stories, setStories] = useState<CompanyStory[]>([]);
  const [postLikes, setPostLikes] = useState<Record<string, number>>({});
  const [storyDialogOpen, setStoryDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, [companyId]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchPosts(),
        fetchStories(),
        fetchLikes()
      ]);
    } catch (error) {
      console.error("Error fetching company activity:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('company_posts')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (data) setPosts(data);
  };

  const fetchStories = async () => {
    const { data } = await supabase
      .from('company_stories')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (data) {
      // Fetch views count for each story
      const storiesWithViews = await Promise.all(
        data.map(async (story) => {
          const { count } = await supabase
            .from('company_story_views')
            .select('*', { count: 'exact', head: true })
            .eq('story_id', story.id);
          
          return { ...story, views_count: count || 0 };
        })
      );
      setStories(storiesWithViews);
    }
  };

  const fetchLikes = async () => {
    const { data: postsData } = await supabase
      .from('company_posts')
      .select('id')
      .eq('company_id', companyId);
    
    if (postsData) {
      const likesMap: Record<string, number> = {};
      
      await Promise.all(
        postsData.map(async (post) => {
          const { count } = await supabase
            .from('company_post_likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);
          
          likesMap[post.id] = count || 0;
        })
      );
      
      setPostLikes(likesMap);
    }
  };

  const totalLikes = Object.values(postLikes).reduce((sum, count) => sum + count, 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Social Activity</CardTitle>
              <CardDescription>Your latest posts, stories, and likes</CardDescription>
            </div>
            {isCompanyMember && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStoryDialogOpen(true)}
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
                Create Story
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="posts">Posts ({posts.length})</TabsTrigger>
              <TabsTrigger value="stories">Stories ({stories.length})</TabsTrigger>
              <TabsTrigger value="likes">Likes ({totalLikes})</TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="space-y-4 mt-6">
              {posts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No posts yet</p>
                  {isCompanyMember && (
                    <Button variant="outline" size="sm" className="mt-4">
                      Create First Post
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {posts.map((post) => (
                    <div key={post.id} className="relative group">
                      {post.media_url ? (
                        <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                          <img
                            src={post.media_url}
                            alt="Post media"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      ) : (
                        <div className="aspect-square rounded-lg border p-4 flex items-center justify-center bg-muted/50">
                          <p className="text-sm text-muted-foreground line-clamp-4">
                            {post.content}
                          </p>
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2 right-2 flex items-center gap-3 text-xs text-white">
                        <span className="flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded px-2 py-1">
                          <Heart className="w-3 h-3" />
                          {postLikes[post.id] || 0}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="stories" className="space-y-4 mt-6">
              {stories.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No active stories</p>
                  {isCompanyMember && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-4"
                      onClick={() => setStoryDialogOpen(true)}
                    >
                      Create Story
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {stories.map((story) => (
                    <div key={story.id} className="aspect-[9/16] relative rounded-lg overflow-hidden group">
                      {story.media_type === 'video' ? (
                        <video
                          src={story.media_url}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={story.media_url}
                          alt="Story"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )}
                      <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 text-xs text-white">
                        <span className="flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded px-2 py-1">
                          <Eye className="w-3 h-3" />
                          {story.views_count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="likes" className="space-y-4 mt-6">
              <div className="text-center py-12">
                <Heart className="w-12 h-12 mx-auto mb-4 text-red-500 opacity-20" />
                <p className="text-2xl font-bold mb-2">{totalLikes}</p>
                <p className="text-sm text-muted-foreground">Total likes across all posts</p>
              </div>
            </TabsContent>
          </Tabs>

          {posts.length === 0 && stories.length === 0 && isCompanyMember && (
            <div className="mt-6 p-6 border rounded-lg bg-muted/50 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Start sharing content to engage with your community
              </p>
              <Button variant="default" size="sm" onClick={() => setStoryDialogOpen(true)}>
                <Settings className="w-4 h-4 mr-2" />
                Create Your First Story
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateCompanyStoryDialog
        open={storyDialogOpen}
        onOpenChange={setStoryDialogOpen}
        companyId={companyId}
        onStoryCreated={fetchAllData}
      />
    </>
  );
}
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Heart, MessageCircle, Share2, Instagram, Twitter, Video, Settings, Youtube, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { processPostContent } from "@/lib/textUtils";
import { extractYouTubeVideoId, containsYouTubeUrl } from "@/lib/youtubeUtils";

interface Post {
  id: string;
  content: string;
  media_url?: string;
  created_at: string;
  likes_count?: number;
  comments_count?: number;
}

interface Story {
  id: string;
  media_url: string;
  media_type: string;
  created_at: string | null;
}

interface Like {
  id: string;
  post_id: string;
  created_at: string;
  post?: {
    content: string;
    user?: {
      full_name: string;
      avatar_url: string;
    };
  };
}

interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface SocialActivityFeedProps {
  userId?: string;
  isReadOnly?: boolean;
}

export const SocialActivityFeed = ({ userId, isReadOnly = false }: SocialActivityFeedProps = {}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const targetUserId = userId || user?.id;
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [likes, setLikes] = useState<Like[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (targetUserId) {
      fetchAllData();
    }
  }, [targetUserId]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchPosts(),
        fetchStories(),
        fetchLikes(),
        fetchSocialAccounts()
      ]);
    } catch (error) {
      console.error("Error fetching activity:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    if (!targetUserId) return;
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (data) setPosts(data);
  };

  const fetchStories = async () => {
    if (!targetUserId) return;
    const { data } = await supabase
      .from('stories')
      .select('*')
      .eq('user_id', targetUserId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (data) setStories(data as Story[]);
  };

  const fetchLikes = async () => {
    if (!targetUserId) return;
    const { data } = await supabase
      .from('post_likes')
      .select(`
        id,
        created_at,
        post_id,
        post:posts(
          content,
          user:profiles(full_name, avatar_url)
        )
      `)
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (data) setLikes(data as any);
  };

  const fetchSocialAccounts = async () => {
    if (!targetUserId) return;
    const { data } = await supabase
      .from('social_media_accounts')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('is_active', true);
    
    if (data) setSocialAccounts(data as SocialAccount[]);
  };

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, any> = {
      instagram: Instagram,
      twitter: Twitter,
      tiktok: Video,
    };
    const Icon = icons[platform] || Share2;
    return <Icon className="h-4 w-4" />;
  };

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      instagram: "from-purple-500 to-pink-500",
      twitter: "from-blue-400 to-blue-600",
      tiktok: "from-black to-gray-800",
    };
    return colors[platform] || "from-gray-500 to-gray-700";
  };

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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Social Activity</CardTitle>
            <CardDescription>{isReadOnly ? 'Latest posts, stories, and likes' : 'Your latest posts, stories, and likes'}</CardDescription>
          </div>
          {!isReadOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/settings#social')}
              className="gap-2"
            >
              <Settings className="w-4 h-4" />
              Connect Platforms
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Connected Platforms Overview */}
        {socialAccounts.length > 0 && (
          <div className="mb-6">
            <p className="text-sm text-muted-foreground mb-3">Connected Platforms</p>
            <div className="flex flex-wrap gap-2">
              {socialAccounts.map((account) => (
                <Badge key={account.id} variant="secondary" className="gap-2">
                  <div className={`bg-gradient-to-br ${getPlatformColor(account.platform)} p-1 rounded`}>
                    {getPlatformIcon(account.platform)}
                  </div>
                  @{account.username}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="posts">Posts ({posts.length})</TabsTrigger>
            <TabsTrigger value="stories">Stories ({stories.length})</TabsTrigger>
            <TabsTrigger value="likes">Likes ({likes.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="space-y-4">
            {posts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No posts yet</p>
              </div>
            ) : (
              posts.map((post) => {
                const cleanContent = processPostContent(post.content);
                const hasYouTube = containsYouTubeUrl(post.content);
                const youtubeId = hasYouTube ? extractYouTubeVideoId(post.content) : null;
                
                return (
                  <div key={post.id} className="glass-card p-4 space-y-3 relative">
                    <p className="text-sm text-foreground break-words">{cleanContent}</p>
                    
                    {hasYouTube && youtubeId && (
                      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                        <Youtube className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">YouTube Video</span>
                      </div>
                    )}
                    
                    {post.media_url && !hasYouTube && (
                      <img
                        src={post.media_url}
                        alt="Post media"
                        className="rounded-lg w-16 h-16 object-cover"
                      />
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          {post.likes_count || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          {post.comments_count || 0}
                        </span>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/feed?highlight=${post.id}`)}
                        className="text-xs gap-1 h-auto py-1 px-2"
                      >
                        See full post
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="stories" className="space-y-4">
            {stories.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Video className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No stories in the last 24 hours</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {stories.map((story) => (
                  <div key={story.id} className="aspect-[9/16] relative rounded-lg overflow-hidden">
                    {story.media_type === 'video' ? (
                      <video
                        src={story.media_url}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={story.media_url}
                        alt="Story"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="likes" className="space-y-4">
            {likes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Heart className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No liked posts yet</p>
              </div>
            ) : (
              likes.map((like) => {
                const cleanContent = like.post?.content ? processPostContent(like.post.content) : '';
                const hasYouTube = like.post?.content ? containsYouTubeUrl(like.post.content) : false;
                const youtubeId = hasYouTube && like.post?.content ? extractYouTubeVideoId(like.post.content) : null;
                
                return (
                  <div key={like.id} className="glass-card p-4 space-y-3 relative">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={like.post?.user?.avatar_url} />
                        <AvatarFallback>{like.post?.user?.full_name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{like.post?.user?.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(like.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Heart className="w-5 h-5 fill-red-500 text-red-500" />
                    </div>
                    
                    <p className="text-sm text-foreground break-words">{cleanContent}</p>
                    
                    {hasYouTube && youtubeId && (
                      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                        <Youtube className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">YouTube Video</span>
                      </div>
                    )}
                    
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/feed?highlight=${like.post_id}`)}
                        className="text-xs gap-1 h-auto py-1 px-2"
                      >
                        See full post
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>

        {socialAccounts.length === 0 && !isReadOnly && (
          <div className="mt-6 p-6 border rounded-lg bg-muted/50 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Connect your social media accounts to see aggregated posts from other platforms
            </p>
            <Button onClick={() => navigate('/settings#social')} variant="default" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Connect Social Platforms
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

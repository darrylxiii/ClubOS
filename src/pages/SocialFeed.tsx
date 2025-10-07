import { AppLayout } from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, Bookmark, Play, TrendingUp, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface UnifiedPost {
  id: string;
  user_id: string;
  platform: string;
  post_type: string;
  content: string;
  media_urls: string[];
  thumbnail_url: string | null;
  hashtags: string[];
  likes_count: number;
  comments_count: number;
  shares_count: number;
  views_count: number;
  published_at: string;
  profile?: {
    full_name: string;
    avatar_url: string;
  };
  social_account?: {
    username: string;
    display_name: string;
    platform: string;
  };
}

const SocialFeed = () => {
  const [posts, setPosts] = useState<UnifiedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetchPosts();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("unified_posts_feed")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "unified_posts",
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filter]);

  const fetchPosts = async () => {
    try {
      let query = supabase
        .from("unified_posts")
        .select(`
          *,
          social_account:social_media_accounts(username, display_name, platform)
        `)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(50);

      if (filter !== "all") {
        query = query.eq("platform", filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Enrich with profile data
      const postsWithProfiles = await Promise.all(
        (data || []).map(async (post: any) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", post.user_id)
            .single();

          return {
            ...post,
            profile: profile || { full_name: "Unknown", avatar_url: "" }
          };
        })
      );

      setPosts(postsWithProfiles as UnifiedPost[]);
    } catch (error) {
      console.error("Error fetching posts:", error);
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      const { error } = await supabase
        .from("unified_posts")
        .update({ likes_count: post.likes_count + 1 })
        .eq("id", postId);

      if (error) throw error;

      setPosts(posts.map(p => 
        p.id === postId ? { ...p, likes_count: p.likes_count + 1 } : p
      ));
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      instagram: "📷",
      twitter: "🐦",
      tiktok: "🎵",
      youtube: "▶️",
      linkedin: "💼",
      facebook: "👥",
      internal: "🏠"
    };
    return icons[platform] || "📱";
  };

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      instagram: "bg-gradient-to-r from-purple-500 to-pink-500",
      twitter: "bg-blue-500",
      tiktok: "bg-black",
      youtube: "bg-red-600",
      linkedin: "bg-blue-700",
      facebook: "bg-blue-600",
      internal: "bg-primary"
    };
    return colors[platform] || "bg-muted";
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tight">Social Feed</h1>
              <p className="text-muted-foreground mt-2">
                Unified posts from all connected platforms
              </p>
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {/* Platform Filter Tabs */}
          <Tabs defaultValue="all" value={filter} onValueChange={setFilter}>
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="all">All Posts</TabsTrigger>
              <TabsTrigger value="internal">🏠 Club</TabsTrigger>
              <TabsTrigger value="instagram">📷 Instagram</TabsTrigger>
              <TabsTrigger value="twitter">🐦 Twitter</TabsTrigger>
              <TabsTrigger value="tiktok">🎵 TikTok</TabsTrigger>
              <TabsTrigger value="youtube">▶️ YouTube</TabsTrigger>
              <TabsTrigger value="linkedin">💼 LinkedIn</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Posts Feed */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                <p className="text-muted-foreground mt-4">Loading posts...</p>
              </div>
            ) : posts.length === 0 ? (
              <Card className="p-12 text-center bg-card/50 backdrop-blur-sm">
                <div className="text-6xl mb-4">📱</div>
                <h3 className="text-xl font-semibold mb-2">No Posts Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Connect your social media accounts to see posts here
                </p>
                <Button onClick={() => window.location.href = "/social-management"}>
                  Connect Accounts
                </Button>
              </Card>
            ) : (
              posts.map((post) => (
                <Card key={post.id} className="overflow-hidden bg-card/80 backdrop-blur-sm border-border/50 hover:bg-card/90 transition-all">
                  {/* Post Header */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={post.profile?.avatar_url || post.social_account?.username} />
                        <AvatarFallback>
                          {(post.profile?.full_name || post.social_account?.display_name || "U")[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {post.profile?.full_name || post.social_account?.display_name}
                          </span>
                          <Badge variant="secondary" className={`${getPlatformColor(post.platform)} text-white text-xs`}>
                            {getPlatformIcon(post.platform)} {post.platform}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          @{post.social_account?.username} · {formatDistanceToNow(new Date(post.published_at), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                    {post.post_type === "video" && (
                      <Badge variant="outline" className="gap-1">
                        <Play className="h-3 w-3" />
                        {post.post_type}
                      </Badge>
                    )}
                  </div>

                  {/* Post Content */}
                  <div className="px-4 pb-3">
                    <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
                    {post.hashtags && post.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {post.hashtags.map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Post Media */}
                  {post.media_urls && post.media_urls.length > 0 && (
                    <div className="relative">
                      {post.post_type === "video" ? (
                        <div className="relative bg-black aspect-video">
                          {post.thumbnail_url ? (
                            <img 
                              src={post.thumbnail_url} 
                              alt="Video thumbnail"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Play className="h-16 w-16 text-white/50" />
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-black/50 backdrop-blur-sm rounded-full p-4">
                              <Play className="h-8 w-8 text-white" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className={`grid ${post.media_urls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-1`}>
                          {post.media_urls.slice(0, 4).map((url, idx) => (
                            <img 
                              key={idx}
                              src={url} 
                              alt={`Post media ${idx + 1}`}
                              className="w-full aspect-square object-cover"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Post Stats & Actions */}
                  <div className="px-4 py-3 border-t border-border/50">
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                      <div className="flex gap-4">
                        {post.likes_count > 0 && (
                          <span>{post.likes_count.toLocaleString()} likes</span>
                        )}
                        {post.comments_count > 0 && (
                          <span>{post.comments_count.toLocaleString()} comments</span>
                        )}
                        {post.views_count > 0 && (
                          <span>{post.views_count.toLocaleString()} views</span>
                        )}
                      </div>
                      {post.shares_count > 0 && (
                        <span>{post.shares_count.toLocaleString()} shares</span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-around border-t border-border/50 pt-3">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="gap-2"
                        onClick={() => handleLike(post.id)}
                      >
                        <Heart className="h-4 w-4" />
                        Like
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-2">
                        <MessageCircle className="h-4 w-4" />
                        Comment
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-2">
                        <Share2 className="h-4 w-4" />
                        Share
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-2">
                        <Bookmark className="h-4 w-4" />
                        Save
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default SocialFeed;
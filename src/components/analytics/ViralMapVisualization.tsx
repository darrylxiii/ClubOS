import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Share2, TrendingUp, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ShareNode {
  id: string;
  shared_by: string;
  shared_to: string;
  created_at: string;
  level: number;
  profiles?: { full_name: string | null };
}

export const ViralMapVisualization = () => {
  const { user } = useAuth();
  const [viralPosts, setViralPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchViralData();
    }
  }, [user]);

  const fetchViralData = async () => {
    try {
      // Get user's posts
      const { data: userPosts } = await supabase
        .from("unified_posts")
        .select("id, content, created_at")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!userPosts) return;

      const postsWithShares = await Promise.all(
        userPosts.map(async (post) => {
          // Get all shares for this post
          const { data: shares } = await supabase
            .from("post_shares")
            .select("*, profiles(full_name)")
            .eq("post_id", post.id)
            .order("created_at", { ascending: false });

          // Calculate viral metrics
          const shareCount = shares?.length || 0;
          const uniqueSharers = new Set(shares?.map((s) => s.shared_by)).size;
          const platforms = shares?.reduce((acc: any, s) => {
            acc[s.shared_to] = (acc[s.shared_to] || 0) + 1;
            return acc;
          }, {});

          // Build share tree (simplified - first 2 levels)
          const shareTree = shares?.slice(0, 5).map((share, idx) => ({
            ...share,
            level: share.share_tree_path?.length || 1,
          }));

          return {
            ...post,
            shareCount,
            uniqueSharers,
            platforms,
            shareTree,
            viralScore: shareCount * uniqueSharers,
          };
        })
      );

      // Sort by viral score
      const sorted = postsWithShares
        .filter((p) => p.shareCount > 0)
        .sort((a, b) => b.viralScore - a.viralScore);

      setViralPosts(sorted);
    } catch (error) {
      console.error("Error fetching viral data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading viral analytics...</p>
        </CardContent>
      </Card>
    );
  }

  if (viralPosts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Viral Spread Map
          </CardTitle>
          <CardDescription>Track how your content spreads across the network</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No viral activity yet. Share your posts to see the spread!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Viral Spread Map
        </CardTitle>
        <CardDescription>Your most shared content and engagement flow</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {viralPosts.slice(0, 3).map((post) => (
          <div key={post.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-medium line-clamp-2">{post.content}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(post.created_at).toLocaleDateString()}
                </p>
              </div>
              <Badge variant="secondary" className="gap-1">
                <TrendingUp className="h-3 w-3" />
                {post.viralScore} score
              </Badge>
            </div>

            {/* Stats */}
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Share2 className="h-4 w-4 text-muted-foreground" />
                <span>{post.shareCount} shares</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{post.uniqueSharers} sharers</span>
              </div>
            </div>

            {/* Platform breakdown */}
            {post.platforms && Object.keys(post.platforms).length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {Object.entries(post.platforms).map(([platform, count]: any) => (
                  <Badge key={platform} variant="outline">
                    {platform}: {count}
                  </Badge>
                ))}
              </div>
            )}

            {/* Share tree visualization (simplified) */}
            {post.shareTree && post.shareTree.length > 0 && (
              <div className="space-y-2 border-l-2 border-primary/20 pl-4">
                <p className="text-sm font-medium">Recent Share Flow:</p>
                {post.shareTree.map((share: ShareNode, idx: number) => (
                  <div
                    key={share.id}
                    className="flex items-center gap-2 text-sm"
                    style={{ marginLeft: `${share.level * 12}px` }}
                  >
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-muted-foreground">
                      {share.profiles?.full_name || "User"} → {share.shared_to}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
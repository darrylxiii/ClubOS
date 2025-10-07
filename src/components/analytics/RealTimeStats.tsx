import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Eye, Heart, MessageCircle, Share2, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface RealTimeStat {
  metric: string;
  value: number;
  change: number;
  trending: boolean;
}

export const RealTimeStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<RealTimeStat[]>([
    { metric: "Views (last hour)", value: 0, change: 0, trending: false },
    { metric: "Likes (last hour)", value: 0, change: 0, trending: false },
    { metric: "Comments (last hour)", value: 0, change: 0, trending: false },
    { metric: "Shares (last hour)", value: 0, change: 0, trending: false },
  ]);

  useEffect(() => {
    if (!user) return;

    // Initial fetch
    fetchRealTimeStats();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("realtime-analytics")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "post_interactions",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchRealTimeStats();
        }
      )
      .subscribe();

    // Refresh every minute
    const interval = setInterval(fetchRealTimeStats, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user]);

  const fetchRealTimeStats = async () => {
    if (!user) return;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    try {
      // Get posts from this user
      const { data: userPosts } = await supabase
        .from("unified_posts")
        .select("id")
        .eq("user_id", user.id);

      const postIds = userPosts?.map((p) => p.id) || [];

      if (postIds.length === 0) return;

      // Current hour stats
      const { data: currentViews } = await supabase
        .from("post_views")
        .select("id")
        .in("post_id", postIds)
        .gte("viewed_at", oneHourAgo);

      const { data: currentInteractions } = await supabase
        .from("post_interactions")
        .select("interaction_type")
        .in("post_id", postIds)
        .gte("created_at", oneHourAgo);

      // Previous hour stats for comparison
      const { data: prevInteractions } = await supabase
        .from("post_interactions")
        .select("interaction_type")
        .in("post_id", postIds)
        .gte("created_at", twoHoursAgo)
        .lt("created_at", oneHourAgo);

      const currentLikes = currentInteractions?.filter((i) => i.interaction_type === "like").length || 0;
      const currentComments = currentInteractions?.filter((i) => i.interaction_type === "comment").length || 0;
      const currentShares = currentInteractions?.filter((i) => i.interaction_type === "share").length || 0;

      const prevLikes = prevInteractions?.filter((i) => i.interaction_type === "like").length || 0;
      const prevComments = prevInteractions?.filter((i) => i.interaction_type === "comment").length || 0;
      const prevShares = prevInteractions?.filter((i) => i.interaction_type === "share").length || 0;

      setStats([
        {
          metric: "Views (last hour)",
          value: currentViews?.length || 0,
          change: 0,
          trending: (currentViews?.length || 0) > 50,
        },
        {
          metric: "Likes (last hour)",
          value: currentLikes,
          change: currentLikes - prevLikes,
          trending: currentLikes > prevLikes * 1.5,
        },
        {
          metric: "Comments (last hour)",
          value: currentComments,
          change: currentComments - prevComments,
          trending: currentComments > prevComments * 1.5,
        },
        {
          metric: "Shares (last hour)",
          value: currentShares,
          change: currentShares - prevShares,
          trending: currentShares > prevShares * 1.5,
        },
      ]);
    } catch (error) {
      console.error("Error fetching real-time stats:", error);
    }
  };

  const getIcon = (metric: string) => {
    if (metric.includes("Views")) return <Eye className="h-4 w-4" />;
    if (metric.includes("Likes")) return <Heart className="h-4 w-4" />;
    if (metric.includes("Comments")) return <MessageCircle className="h-4 w-4" />;
    if (metric.includes("Shares")) return <Share2 className="h-4 w-4" />;
    return <TrendingUp className="h-4 w-4" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Live Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.metric}
              className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {getIcon(stat.metric)}
                <div>
                  <p className="text-sm text-muted-foreground">{stat.metric}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">{stat.value}</p>
                    {stat.trending && (
                      <Badge variant="secondary" className="gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Trending
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              {stat.change !== 0 && (
                <Badge variant={stat.change > 0 ? "default" : "secondary"}>
                  {stat.change > 0 ? "+" : ""}
                  {stat.change}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageCircle, Sparkles, Trophy } from "lucide-react";
import { toast } from "sonner";

interface FeedItem {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  achievement_name: string;
  achievement_icon: string;
  achievement_rarity: string;
  unlocked_at: string;
  story_text: string | null;
  reactions: number;
  user_reacted: boolean;
}

export const AchievementFeed = () => {
  const { user } = useAuth();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeed();
    const channel = setupRealtimeFeed();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchFeed = async () => {
    try {
      const { data: achievements } = await supabase
        .from("user_quantum_achievements")
        .select(`
          id,
          user_id,
          unlocked_at,
          story_text,
          is_showcased,
          achievement:quantum_achievements(name, icon_emoji, rarity)
        `)
        .eq("is_showcased", true)
        .order("unlocked_at", { ascending: false })
        .limit(50);

      if (!achievements) return;

      const userIds = [...new Set(achievements.map((a) => a.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      const feedItems: FeedItem[] = await Promise.all(
        achievements.map(async (item) => {
          const profile = profileMap.get(item.user_id);
          const { count: reactionCount } = await supabase
            .from("achievement_reactions")
            .select("*", { count: "exact", head: true })
            .eq("user_achievement_id", item.id);

          const { data: userReaction } = await supabase
            .from("achievement_reactions")
            .select("id")
            .eq("user_achievement_id", item.id)
            .eq("reactor_id", user?.id)
            .single();

          return {
            id: item.id,
            user_id: item.user_id,
            user_name: profile?.full_name || "Quantum Member",
            user_avatar: profile?.avatar_url || "",
            achievement_name: item.achievement.name,
            achievement_icon: item.achievement.icon_emoji,
            achievement_rarity: item.achievement.rarity,
            unlocked_at: item.unlocked_at,
            story_text: item.story_text,
            reactions: reactionCount || 0,
            user_reacted: !!userReaction,
          };
        })
      );

      setFeed(feedItems);
    } catch (error) {
      console.error("Error fetching feed:", error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeFeed = () => {
    const channel = supabase
      .channel("achievement-feed")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_quantum_achievements",
          filter: "is_showcased=eq.true",
        },
        () => {
          fetchFeed();
        }
      )
      .subscribe();

    return channel;
  };

  const handleReaction = async (achievementId: string, currentlyReacted: boolean) => {
    try {
      if (currentlyReacted) {
        await supabase
          .from("achievement_reactions")
          .delete()
          .eq("user_achievement_id", achievementId)
          .eq("reactor_id", user?.id);
        toast.success("Reaction removed");
      } else {
        await supabase.from("achievement_reactions").insert({
          user_achievement_id: achievementId,
          reactor_id: user?.id,
          reaction_type: "applause",
        });
        toast.success("Quantum applause sent! 👏");
      }
      fetchFeed();
    } catch (error) {
      console.error("Error reacting:", error);
      toast.error("Failed to react");
    }
  };

  const rarityColors: Record<string, string> = {
    common: "border-gray-500/30",
    rare: "border-blue-500/30",
    epic: "border-purple-500/30",
    legendary: "border-orange-500/30",
    quantum: "border-primary/30",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Sparkles className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {feed.map((item) => (
        <Card key={item.id} className="glass p-6 hover:border-primary/30 transition-all">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12 border-2 border-primary/20">
              <AvatarImage src={item.user_avatar} />
              <AvatarFallback>{item.user_name.charAt(0)}</AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold">{item.user_name}</span>
                <span className="text-muted-foreground text-sm">unlocked</span>
                <div
                  className={`flex items-center gap-2 px-3 py-1 rounded-full border-2 ${
                    rarityColors[item.achievement_rarity]
                  } bg-background/50 backdrop-blur`}
                >
                  <span className="text-2xl">{item.achievement_icon}</span>
                  <span className="font-semibold">{item.achievement_name}</span>
                  <Badge variant="outline" className="text-xs capitalize">
                    {item.achievement_rarity}
                  </Badge>
                </div>
              </div>

              {item.story_text && (
                <p className="text-sm text-muted-foreground mb-3">{item.story_text}</p>
              )}

              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(item.unlocked_at), { addSuffix: true })}
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`gap-2 ${item.user_reacted ? "text-primary" : ""}`}
                    onClick={() => handleReaction(item.id, item.user_reacted)}
                  >
                    <Heart
                      className={`h-4 w-4 ${item.user_reacted ? "fill-current" : ""}`}
                    />
                    <span className="text-xs">{item.reactions}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}

      {feed.length === 0 && (
        <Card className="glass p-12 text-center">
          <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Recent Achievements</h3>
          <p className="text-muted-foreground">
            Be the first to unlock and showcase an achievement!
          </p>
        </Card>
      )}
    </div>
  );
};

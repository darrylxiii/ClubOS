import { useEffect, useState } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { BadgeCard } from "./BadgeCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles } from "lucide-react";

interface TimelineAchievement {
  id: string;
  achievement_id: string;
  name: string;
  description: string;
  icon_emoji: string;
  rarity: string;
  category: string;
  unlocked_at: string | null;
  animation_effect: string;
  points: number;
  is_unlocked: boolean;
}

export const AchievementTimeline = () => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<TimelineAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTimeline();
    }
  }, [user]);

  const fetchTimeline = async () => {
    try {
      // Get all achievements
      const { data: allAchievements } = await supabase
        .from("quantum_achievements")
        .select("*")
        .eq("is_active", true)
        .order("rarity", { ascending: false });

      // Get user's unlocked achievements
      const { data: userAchievements } = await supabase
        .from("user_quantum_achievements")
        .select("achievement_id, unlocked_at, id")
        .eq("user_id", user?.id);

      const unlockedMap = new Map(
        userAchievements?.map((ua) => [ua.achievement_id, ua]) || []
      );

      const timeline: TimelineAchievement[] =
        allAchievements?.map((achievement) => {
          const userAch = unlockedMap.get(achievement.id);
          return {
            id: userAch?.id || achievement.id,
            achievement_id: achievement.id,
            name: achievement.name,
            description: achievement.description,
            icon_emoji: achievement.icon_emoji,
            rarity: achievement.rarity,
            category: achievement.category,
            unlocked_at: userAch?.unlocked_at || null,
            animation_effect: achievement.animation_effect,
            points: achievement.points,
            is_unlocked: !!userAch,
          };
        }) || [];

      // Sort: unlocked first by date, then locked by rarity
      timeline.sort((a, b) => {
        if (a.is_unlocked && !b.is_unlocked) return -1;
        if (!a.is_unlocked && b.is_unlocked) return 1;
        if (a.is_unlocked && b.is_unlocked) {
          return new Date(b.unlocked_at!).getTime() - new Date(a.unlocked_at!).getTime();
        }
        return 0;
      });

      setAchievements(timeline);
    } catch (error) {
      console.error("Error fetching timeline:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Sparkles className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const unlockedCount = achievements.filter((a) => a.is_unlocked).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="gap-2">
          <Sparkles className="h-3 w-3" />
          {unlockedCount} / {achievements.length} Quantum Jumps
        </Badge>
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-6 pb-4">
          {achievements.map((achievement, index) => (
            <div key={achievement.id} className="relative">
              <BadgeCard achievement={achievement} isTimeline />
              {index < achievements.length - 1 && (
                <div
                  className={`absolute top-1/2 -right-3 w-6 h-0.5 ${
                    achievement.is_unlocked
                      ? "bg-gradient-to-r from-primary to-transparent"
                      : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

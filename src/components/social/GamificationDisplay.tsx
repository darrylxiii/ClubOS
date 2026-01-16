import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Trophy,
  Flame,
  Star,
  TrendingUp,
  Award,
  Zap,
  Target,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface UserEngagement {
  current_streak: number | null;
  longest_streak: number | null;
  total_posts: number | null;
  level: number | null;
  experience_points: number | null;
  badges: unknown;
  achievements: unknown;
}

export const GamificationDisplay = () => {
  const [engagement, setEngagement] = useState<UserEngagement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEngagement();
  }, []);

  const fetchEngagement = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_engagement")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      setEngagement(data);
    } catch (error) {
      console.error("Error fetching engagement:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !engagement) {
    return null;
  }

  const level = engagement.level ?? 1;
  const experiencePoints = engagement.experience_points ?? 0;
  const experienceToNextLevel = level * 100;
  const progressPercentage = (experiencePoints / experienceToNextLevel) * 100;

  const stats = [
    {
      icon: Flame,
      label: "Current Streak",
      value: `${engagement.current_streak ?? 0} days`,
      color: "text-orange-500",
    },
    {
      icon: Trophy,
      label: "Longest Streak",
      value: `${engagement.longest_streak ?? 0} days`,
      color: "text-yellow-500",
    },
    {
      icon: Star,
      label: "Total Posts",
      value: (engagement.total_posts ?? 0).toString(),
      color: "text-blue-500",
    },
    {
      icon: Zap,
      label: "Level",
      value: level.toString(),
      color: "text-purple-500",
    },
  ];

  const badges = [
    { id: 1, name: "Early Adopter", icon: "🌟", unlocked: true },
    { id: 2, name: "Consistent Creator", icon: "🔥", unlocked: (engagement.current_streak ?? 0) >= 7 },
    { id: 3, name: "Social Butterfly", icon: "🦋", unlocked: (engagement.total_posts ?? 0) >= 10 },
    { id: 4, name: "Engagement Master", icon: "💎", unlocked: level >= 5 },
  ];

  return (
    <div className="space-y-6">
      {/* Level Progress */}
      <Card className="p-6 bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 border-primary/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Level</p>
              <p className="text-3xl font-bold">{level}</p>
            </div>
          </div>
          <Badge variant="secondary" className="gap-2">
            <Zap className="h-4 w-4" />
            {experiencePoints} XP
          </Badge>
        </div>
        <Progress value={progressPercentage} className="h-3" />
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {experienceToNextLevel - experiencePoints} XP to Level{" "}
          {level + 1}
        </p>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-4 text-center">
              <Icon className={`h-8 w-8 mx-auto mb-2 ${stat.color}`} />
              <p className="text-2xl font-bold mb-1">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </Card>
          );
        })}
      </div>

      {/* Badges */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Badges & Achievements
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all ${
                badge.unlocked
                  ? "border-primary bg-primary/5 shadow-lg"
                  : "border-border/50 bg-muted/30 opacity-40"
              }`}
            >
              <span className="text-4xl mb-2">{badge.icon}</span>
              <p className="text-sm font-medium text-center">{badge.name}</p>
              {!badge.unlocked && (
                <Badge variant="secondary" className="mt-2 text-xs">
                  Locked
                </Badge>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Leaderboard Teaser */}
      <Card className="p-6 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">Weekly Leaderboard</h3>
            <p className="text-sm text-muted-foreground">
              You're in the top 20% of creators this week!
            </p>
          </div>
          <TrendingUp className="h-12 w-12 text-yellow-500" />
        </div>
      </Card>
    </div>
  );
};

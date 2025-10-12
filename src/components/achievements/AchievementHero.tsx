import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Sparkles, Zap, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TopAchievement {
  id: string;
  name: string;
  icon_emoji: string;
  rarity: string;
  animation_effect: string;
  unlocked_at: string;
}

export const AchievementHero = () => {
  const { user } = useAuth();
  const [topAchievements, setTopAchievements] = useState<TopAchievement[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [totalXP, setTotalXP] = useState(0);
  const [nextMilestone, setNextMilestone] = useState(1000);

  useEffect(() => {
    if (user) {
      fetchHeroData();
    }
  }, [user]);

  const fetchHeroData = async () => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();

      setProfile(profileData);

      // Fetch top 3 rarest achievements
      const { data: achievements } = await supabase
        .from("user_quantum_achievements")
        .select(`
          *,
          achievement:quantum_achievements(*)
        `)
        .eq("user_id", user?.id)
        .order("unlocked_at", { ascending: false })
        .limit(3);

      if (achievements) {
        const formatted = achievements
          .filter((a) => a.achievement)
          .map((a) => ({
            id: a.id,
            name: a.achievement.name,
            icon_emoji: a.achievement.icon_emoji,
            rarity: a.achievement.rarity,
            animation_effect: a.achievement.animation_effect,
            unlocked_at: a.unlocked_at,
          }));
        setTopAchievements(formatted);
      }

      // Fetch total XP from user engagement
      const { data: engagement } = await supabase
        .from("user_engagement")
        .select("experience_points")
        .eq("user_id", user?.id)
        .single();

      if (engagement) {
        setTotalXP(engagement.experience_points);
        setNextMilestone(Math.ceil(engagement.experience_points / 1000) * 1000);
      }
    } catch (error) {
      console.error("Error fetching hero data:", error);
    }
  };

  const rarityColors: Record<string, string> = {
    common: "from-gray-500/20 to-gray-600/20 border-gray-500/30",
    rare: "from-blue-500/20 to-cyan-500/20 border-blue-500/30",
    epic: "from-purple-500/20 to-pink-500/20 border-purple-500/30",
    legendary: "from-orange-500/20 to-red-500/20 border-orange-500/30",
    quantum: "from-primary/20 to-accent/20 border-primary/30",
  };

  const progressPercentage = (totalXP / nextMilestone) * 100;

  return (
    <div className="relative overflow-hidden">
      {/* Quantum Background Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 animate-pulse-slow" />
      <div className="absolute inset-0 bg-[url('/quantum-grid.svg')] opacity-5" />

      <div className="container mx-auto px-4 py-12 relative z-10">
        <Card className="glass-strong border-primary/20 overflow-hidden">
          <div className="p-8">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Avatar Section */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-full blur-xl opacity-50 animate-pulse" />
                <Avatar className="h-32 w-32 border-4 border-primary/30 relative">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="text-2xl">
                    {profile?.full_name?.charAt(0) || "Q"}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Info Section */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
                  <h1 className="text-4xl font-bold text-foreground">
                    {profile?.full_name || "Quantum Member"}
                  </h1>
                  <Crown className="h-6 w-6 text-primary animate-pulse" />
                </div>
                <p className="text-muted-foreground mb-4">{profile?.title || "Achievement Hunter"}</p>

                {/* XP Progress */}
                <div className="mb-6 max-w-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      Quantum Energy
                    </span>
                    <Badge variant="secondary" className="gap-1">
                      <Sparkles className="h-3 w-3" />
                      {totalXP} XP
                    </Badge>
                  </div>
                  <Progress value={progressPercentage} className="h-3 glass" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {nextMilestone - totalXP} XP to next milestone
                  </p>
                </div>

                {/* Top Badges Worn */}
                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                  {topAchievements.map((achievement, index) => (
                    <div
                      key={achievement.id}
                      className={`relative group cursor-pointer transition-all hover:scale-110 ${
                        index === 0 ? "scale-110" : ""
                      }`}
                    >
                      <div
                        className={`h-20 w-20 rounded-xl bg-gradient-to-br ${
                          rarityColors[achievement.rarity]
                        } border-2 flex items-center justify-center backdrop-blur-sm quantum-ripple`}
                      >
                        <span className="text-4xl animate-float">{achievement.icon_emoji}</span>
                      </div>
                      <div className="absolute -top-2 -right-2">
                        <Badge variant="outline" className="text-xs bg-background/80 backdrop-blur">
                          #{index + 1}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {topAchievements.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Unlock achievements to showcase them here
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Award, Trophy, Target, Flame, Star, Crown } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Milestone {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  icon: any;
  unlocked: boolean;
  color: string;
}

export const MilestonesGamification = () => {
  const { user } = useAuth();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [streak, setStreak] = useState(0);
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      fetchMilestones();
      fetchStreak();
      fetchLeaderboardRank();
    }
  }, [user]);

  const fetchMilestones = async () => {
    try {
      // Fetch user's stats
      const { data: profileData } = await supabase
        .from("profile_analytics")
        .select("*")
        .eq("user_id", user?.id)
        .order("date", { ascending: false })
        .limit(1)
        .single();

      const { data: engagement } = await supabase
        .from("user_engagement")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      const stats = {
        followers: profileData?.followers_count || 0,
        posts: profileData?.post_count || 0,
        engagement: profileData?.total_engagement || 0,
        views: profileData?.profile_views || 0,
        xp: engagement?.experience_points || 0,
      };

      // Define milestones
      const allMilestones: Milestone[] = [
        {
          id: "first_post",
          title: "First Steps",
          description: "Create your first post",
          target: 1,
          current: stats.posts,
          icon: Target,
          unlocked: stats.posts >= 1,
          color: "text-blue-500",
        },
        {
          id: "10_posts",
          title: "Content Creator",
          description: "Publish 10 posts",
          target: 10,
          current: stats.posts,
          icon: Star,
          unlocked: stats.posts >= 10,
          color: "text-purple-500",
        },
        {
          id: "100_followers",
          title: "Rising Star",
          description: "Reach 100 followers",
          target: 100,
          current: stats.followers,
          icon: Trophy,
          unlocked: stats.followers >= 100,
          color: "text-yellow-500",
        },
        {
          id: "1000_views",
          title: "Viral Impact",
          description: "Get 1,000 profile views",
          target: 1000,
          current: stats.views,
          icon: Flame,
          unlocked: stats.views >= 1000,
          color: "text-orange-500",
        },
        {
          id: "500_engagement",
          title: "Engagement Master",
          description: "Receive 500 total engagements",
          target: 500,
          current: stats.engagement,
          icon: Award,
          unlocked: stats.engagement >= 500,
          color: "text-green-500",
        },
        {
          id: "1000_xp",
          title: "Platform Legend",
          description: "Earn 1,000 XP",
          target: 1000,
          current: stats.xp,
          icon: Crown,
          unlocked: stats.xp >= 1000,
          color: "text-red-500",
        },
      ];

      setMilestones(allMilestones);
    } catch (error) {
      console.error("Error fetching milestones:", error);
    }
  };

  const fetchStreak = async () => {
    try {
      const { data } = await supabase
        .from("user_engagement")
        .select("current_streak")
        .eq("user_id", user?.id)
        .single();

      setStreak(data?.current_streak || 0);
    } catch (error) {
      console.error("Error fetching streak:", error);
    }
  };

  const fetchLeaderboardRank = async () => {
    try {
      // Get all users' XP and find current user's rank
      const { data: allUsers } = await supabase
        .from("user_engagement")
        .select("user_id, experience_points")
        .order("experience_points", { ascending: false });

      if (allUsers) {
        const rank = allUsers.findIndex((u) => u.user_id === user?.id) + 1;
        setLeaderboardRank(rank > 0 ? rank : null);
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    }
  };

  const unlockedCount = milestones.filter((m) => m.unlocked).length;
  const progressPercentage = (unlockedCount / milestones.length) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Milestones & Achievements
            </CardTitle>
            <CardDescription>Track your progress and unlock rewards</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">
              {unlockedCount}/{milestones.length}
            </p>
            <p className="text-xs text-muted-foreground">Unlocked</p>
          </div>
        </div>
        <Progress value={progressPercentage} className="mt-4" />
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Streak & Rank */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-lg p-4 border border-orange-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="h-5 w-5 text-orange-500" />
              <p className="font-semibold">Current Streak</p>
            </div>
            <p className="text-3xl font-bold">{streak} days</p>
          </div>

          {leaderboardRank && (
            <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-lg p-4 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-5 w-5 text-purple-500" />
                <p className="font-semibold">Leaderboard</p>
              </div>
              <p className="text-3xl font-bold">#{leaderboardRank}</p>
            </div>
          )}
        </div>

        {/* Milestones */}
        <div className="space-y-3">
          {milestones.map((milestone) => {
            const Icon = milestone.icon;
            const progress = Math.min((milestone.current / milestone.target) * 100, 100);

            return (
              <div
                key={milestone.id}
                className={`p-4 rounded-lg border transition-all ${
                  milestone.unlocked
                    ? "bg-accent/50 border-primary/30"
                    : "bg-card border-border hover:border-primary/20"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        milestone.unlocked ? "bg-primary/20" : "bg-muted"
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${milestone.unlocked ? milestone.color : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <h4 className="font-semibold">{milestone.title}</h4>
                      <p className="text-sm text-muted-foreground">{milestone.description}</p>
                    </div>
                  </div>
                  {milestone.unlocked && (
                    <Badge variant="default" className="gap-1">
                      <Award className="h-3 w-3" />
                      Unlocked
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">
                      {milestone.current}/{milestone.target}
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
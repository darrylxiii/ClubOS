import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, ArrowRight, Lock, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { T } from "@/components/T";
import { motion } from "framer-motion";

interface UserAchievement {
  id: string;
  unlocked_at: string;
  quantum_achievements: {
    id: string;
    name: string;
    icon_emoji: string;
    rarity: string;
    points: number;
  };
}

export const AchievementsPreviewWidget = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['achievements-preview', user?.id],
    queryFn: async () => {
      if (!user) return { achievements: [], totalCount: 0, totalPoints: 0, nextMilestone: 10 };

      // Get recent unlocked achievements
      const { data: recentAchievements, error } = await supabase
        .from('user_quantum_achievements')
        .select(`
          id,
          unlocked_at,
          quantum_achievements (
            id,
            name,
            icon_emoji,
            rarity,
            points
          )
        `)
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false })
        .limit(3);

      if (error) throw error;

      // Get total count and points
      const { count: totalCount } = await supabase
        .from('user_quantum_achievements')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Calculate total points from achievements
      const { data: allAchievements } = await supabase
        .from('user_quantum_achievements')
        .select('quantum_achievements(points)')
        .eq('user_id', user.id);

      const totalPoints = allAchievements?.reduce((sum, a) => {
        const achievement = a.quantum_achievements as any;
        return sum + (achievement?.points || 0);
      }, 0) || 0;

      // Milestones: 5, 10, 25, 50, 100
      const milestones = [5, 10, 25, 50, 100];
      const nextMilestone = milestones.find(m => m > (totalCount || 0)) || 100;

      return {
        achievements: (recentAchievements || []) as UserAchievement[],
        totalCount: totalCount || 0,
        totalPoints,
        nextMilestone,
      };
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <Card className="glass-subtle rounded-2xl">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-12 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-2 w-full" />
        </CardContent>
      </Card>
    );
  }

  const progressToNext = data ? (data.totalCount / data.nextMilestone) * 100 : 0;

  return (
    <Card className="glass-subtle rounded-2xl overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          <T k="common:achievements.title" fallback="Achievements" />
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm flex items-center gap-2">
          <Star className="h-3 w-3 text-yellow-500" />
          <span>{data?.totalPoints || 0} XP earned</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data && data.achievements.length > 0 ? (
          <>
            {/* Recent achievements */}
            <div className="flex items-center gap-2">
              {data.achievements.map((achievement, index) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative group"
                >
                  <div className={`
                    h-12 w-12 rounded-lg flex items-center justify-center text-2xl
                    bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30
                    group-hover:scale-110 transition-transform cursor-pointer
                  `}>
                    {achievement.quantum_achievements?.icon_emoji || '🏆'}
                  </div>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
                      {achievement.quantum_achievements?.name}
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {/* Next achievement slot */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="h-12 w-12 rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/30"
              >
                <Lock className="h-4 w-4 text-muted-foreground/50" />
              </motion.div>
            </div>

            {/* Progress to next milestone */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{data.totalCount} unlocked</span>
                <span>Next: {data.nextMilestone}</span>
              </div>
              <Progress value={progressToNext} className="h-2" />
            </div>

            <Button asChild variant="ghost" size="sm" className="w-full">
              <Link to="/achievements">
                <T k="common:achievements.viewAll" fallback="View All Achievements" />
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </>
        ) : (
          <div className="text-center py-4">
            <Trophy className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              <T k="common:achievements.empty" fallback="Start exploring to unlock achievements!" />
            </p>
            <Button asChild size="sm" variant="outline">
              <Link to="/achievements">
                <T k="common:achievements.explore" fallback="Explore Achievements" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

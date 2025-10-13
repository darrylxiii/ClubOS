import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Star, ChevronRight, Trophy, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileStrengthDialog } from "./ProfileStrengthDialog";
import { cn } from "@/lib/utils";

interface ProfileStats {
  current_level: number;
  total_tasks: number;
  completed_tasks: number;
  completion_percentage: number;
  level_1_completed: boolean;
  level_2_completed: boolean;
  level_3_completed: boolean;
  level_4_completed: boolean;
  level_5_completed: boolean;
  all_levels_completed_at: string | null;
}

export const ProfileStrengthWidget = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .from('profile_strength_stats')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile strength:', error);
      }
      
      setStats(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return null;
  }

  // Don't show if 100% complete
  if (stats.all_levels_completed_at) {
    return (
      <Card className="p-4 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">Profile Master!</h3>
            <p className="text-xs text-muted-foreground">You've completed all levels</p>
          </div>
        </div>
      </Card>
    );
  }

  const completionColor = 
    stats.completion_percentage >= 80 ? "text-green-500" :
    stats.completion_percentage >= 50 ? "text-yellow-500" :
    "text-orange-500";

  return (
    <>
      <Card className="p-4 hover:shadow-lg transition-all cursor-pointer border-primary/10" onClick={() => setShowDialog(true)}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-accent flex items-center justify-center shadow-glow">
              <Target className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Profile Strength</h3>
              <div className="flex items-center gap-2">
                <span className={cn("text-2xl font-bold", completionColor)}>
                  {Math.round(stats.completion_percentage)}%
                </span>
                <Badge variant="outline" className="text-xs">
                  Level {stats.current_level}/5
                </Badge>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Progress value={stats.completion_percentage} className="h-2 mb-3" />

        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <span>{stats.completed_tasks} of {stats.total_tasks} tasks</span>
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Keep going!
          </span>
        </div>

        {/* Level indicators */}
        <div className="flex items-center justify-between gap-1">
          {[1, 2, 3, 4, 5].map((level) => {
            const isCompleted = 
              (level === 1 && stats.level_1_completed) ||
              (level === 2 && stats.level_2_completed) ||
              (level === 3 && stats.level_3_completed) ||
              (level === 4 && stats.level_4_completed) ||
              (level === 5 && stats.level_5_completed);
            
            const isCurrent = level === stats.current_level;

            return (
              <div
                key={level}
                className={cn(
                  "flex-1 h-1.5 rounded-full transition-all",
                  isCompleted ? "bg-primary" : 
                  isCurrent ? "bg-primary/40" : 
                  "bg-muted"
                )}
              />
            );
          })}
        </div>

        {stats.current_level < 5 && (
          <p className="text-xs text-center text-muted-foreground mt-3">
            Complete Level {stats.current_level} to unlock more features
          </p>
        )}
      </Card>

      <ProfileStrengthDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        stats={stats}
        onTaskComplete={loadStats}
      />
    </>
  );
};

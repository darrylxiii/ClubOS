import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { ProfileStrengthDialog } from "./profile/ProfileStrengthDialog";
import { getTasksForRole, ProfileTask } from "@/lib/profileStrengthTasks";

interface ProfileStats {
  current_level: number | null;
  total_tasks: number | null;
  completed_tasks: number | null;
  completion_percentage: number | null;
  level_1_completed: boolean | null;
  level_2_completed: boolean | null;
  level_3_completed: boolean | null;
  level_4_completed: boolean | null;
  level_5_completed: boolean | null;
  all_levels_completed_at: string | null;
}

export const ProfileCompletion = () => {
  const { user } = useAuth();
  const { currentRole: role } = useRole();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);

  const allTasks = getTasksForRole(role as any);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    try {
      const [statsData, tasksData] = await Promise.all([
        supabase
          .from('profile_strength_stats')
          .select('*')
          .eq('user_id', user?.id ?? '')
          .single(),
        supabase
          .from('profile_strength_tasks')
          .select('task_key, completed')
          .eq('user_id', user?.id ?? '')
          .eq('completed', true)
      ]);

      if (statsData.error && statsData.error.code !== 'PGRST116') {
        console.error('Error loading profile strength:', statsData.error);
      }

      setStats(statsData.data);
      setCompletedTasks(new Set(tasksData.data?.map(t => t.task_key) || []));
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
      <Card className="glass-strong border-0 shadow-glass-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-3 p-4 rounded-xl glass-subtle bg-success/10 border border-success/20">
            <Sparkles className="w-6 h-6 text-success animate-pulse" />
            <div>
              <p className="font-semibold text-success">Profile Master!</p>
              <p className="text-xs text-muted-foreground">You've completed all levels</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get first 4 incomplete tasks
  const incompleteTasks = allTasks.filter(task => !completedTasks.has(task.key)).slice(0, 4);
  const displayTasks = incompleteTasks.length > 0 ? incompleteTasks : allTasks.slice(0, 4);

  const handleTaskClick = (task: ProfileTask) => {
    if (task.actionPath) {
      navigate(task.actionPath);
    }
  };

  const completedCount = stats.completed_tasks;
  const totalCount = stats.total_tasks;

  return (
    <>
      <Card className="glass-strong border-0 shadow-glass-lg">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Profile Strength
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {completedCount} of {totalCount} completed
              </p>
            </div>
            <div className="text-3xl font-black">
              {Math.round(stats.completion_percentage ?? 0)}%
            </div>
          </div>
          
          <Progress value={stats.completion_percentage} className="h-2.5" />
          
          <div className="space-y-2">
            {displayTasks.map((task) => {
              const isCompleted = completedTasks.has(task.key);
              const Icon = task.icon;
              
              return (
                <button
                  key={task.key}
                  onClick={() => handleTaskClick(task)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl glass-subtle hover:bg-card/80 transition-all group text-left"
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground group-hover:text-foreground flex-shrink-0 transition-colors" />
                  )}
                  <span className={`text-sm flex-1 ${isCompleted ? 'line-through text-muted-foreground' : 'font-medium text-foreground'}`}>
                    {task.title}
                  </span>
                  {!isCompleted && (
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
                  )}
                </button>
              );
            })}
          </div>

          <button 
            onClick={() => setShowDialog(true)}
            className="w-full h-11 px-6 rounded-xl font-semibold bg-gradient-accent text-white shadow-glass-md hover:shadow-glass-lg transition-all hover:scale-105 active:scale-95"
          >
            Complete Profile
            <ArrowRight className="inline-block w-4 h-4 ml-2" />
          </button>
        </CardContent>
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

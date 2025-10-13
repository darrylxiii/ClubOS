import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Circle, ArrowRight, Trophy, Target, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getTasksForRole, getTasksByLevel, ProfileTask } from "@/lib/profileStrengthTasks";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

interface ProfileStrengthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: any;
  onTaskComplete: () => void;
}

export const ProfileStrengthDialog = ({ 
  open, 
  onOpenChange, 
  stats,
  onTaskComplete 
}: ProfileStrengthDialogProps) => {
  const { user } = useAuth();
  const { role } = useUserRole();
  const navigate = useNavigate();
  const [activeLevel, setActiveLevel] = useState(stats?.current_level || 1);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const allTasks = getTasksForRole(role as any);

  useEffect(() => {
    if (open && user) {
      loadCompletedTasks();
    }
  }, [open, user]);

  const loadCompletedTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('profile_strength_tasks')
        .select('task_key, completed')
        .eq('user_id', user?.id)
        .eq('completed', true);

      if (error) throw error;

      setCompletedTasks(new Set(data?.map(t => t.task_key) || []));
    } catch (error) {
      console.error('Error loading completed tasks:', error);
    }
  };

  const handleTaskClick = async (task: ProfileTask) => {
    if (task.actionPath) {
      onOpenChange(false);
      navigate(task.actionPath);
    }
  };

  const handleMarkComplete = async (task: ProfileTask) => {
    if (loading) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profile_strength_tasks')
        .upsert({
          user_id: user?.id,
          task_key: task.key,
          task_level: task.level,
          role: role,
          completed: true,
          completed_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,task_key,role'
        });

      if (error) throw error;

      setCompletedTasks(prev => new Set([...prev, task.key]));
      toast.success("Task completed!");
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      onTaskComplete();
    } catch (error) {
      console.error('Error marking task complete:', error);
      toast.error("Failed to update task");
    } finally {
      setLoading(false);
    }
  };

  const renderTaskItem = (task: ProfileTask) => {
    const isCompleted = completedTasks.has(task.key);
    const Icon = task.icon;

    return (
      <div
        key={task.key}
        className={cn(
          "p-4 rounded-lg border transition-all hover:shadow-md",
          isCompleted ? "bg-primary/5 border-primary/20" : "border-border hover:border-primary/40"
        )}
      >
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
            isCompleted ? "bg-primary/20" : "bg-muted"
          )}>
            <Icon className={cn("h-5 w-5", isCompleted ? "text-primary" : "text-muted-foreground")} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className={cn("font-semibold text-sm", isCompleted && "text-muted-foreground line-through")}>
                {task.title}
              </h4>
              {isCompleted && (
                <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-3">{task.description}</p>
            
            <div className="flex gap-2">
              {task.actionPath && !isCompleted && (
                <Button 
                  size="sm" 
                  variant="default"
                  onClick={() => handleTaskClick(task)}
                  className="text-xs h-8"
                >
                  Start
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              )}
              {!isCompleted && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleMarkComplete(task)}
                  disabled={loading}
                  className="text-xs h-8"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Mark Done
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-accent flex items-center justify-center shadow-glow">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl">Profile Strength</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={stats?.completion_percentage || 0} className="w-32 h-2" />
                  <span className="text-sm font-semibold text-primary">
                    {Math.round(stats?.completion_percentage || 0)}%
                  </span>
                </div>
              </div>
            </div>
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              Level {stats?.current_level || 1}/5
            </Badge>
          </div>
        </DialogHeader>

        <Tabs value={activeLevel.toString()} onValueChange={(v) => setActiveLevel(parseInt(v))} className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full justify-start px-6 pt-2 bg-transparent border-b rounded-none">
            {[1, 2, 3, 4, 5].map((level) => {
              const isCompleted = 
                (level === 1 && stats?.level_1_completed) ||
                (level === 2 && stats?.level_2_completed) ||
                (level === 3 && stats?.level_3_completed) ||
                (level === 4 && stats?.level_4_completed) ||
                (level === 5 && stats?.level_5_completed);
              
              const levelTasks = getTasksByLevel(allTasks, level);
              const completedCount = levelTasks.filter(t => completedTasks.has(t.key)).length;

              return (
                <TabsTrigger 
                  key={level} 
                  value={level.toString()}
                  className="flex-col items-start gap-1 data-[state=active]:border-b-2"
                >
                  <div className="flex items-center gap-2">
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                    <span className="font-semibold">Level {level}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {completedCount}/{levelTasks.length}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {[1, 2, 3, 4, 5].map((level) => (
              <TabsContent key={level} value={level.toString()} className="mt-0">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <Trophy className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">
                      {level === 1 && "Essential Setup - Get Started"}
                      {level === 2 && "Build Your Foundation"}
                      {level === 3 && "Active Engagement"}
                      {level === 4 && "Advanced Features"}
                      {level === 5 && "Power User Status"}
                    </h3>
                  </div>
                  {getTasksByLevel(allTasks, level).map(renderTaskItem)}
                </div>
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

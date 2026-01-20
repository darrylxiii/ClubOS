import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { 
  Target, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Pause,
  Play,
  Trash2,
  Sparkles,
  TrendingUp,
  Calendar
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";

interface AgentGoal {
  id: string;
  goal_type: string;
  goal_description: string;
  status: string;
  priority: number;
  current_progress: number;
  deadline: string | null;
  next_action_at: string | null;
  next_action_description: string | null;
  created_at: string;
  agent_goal_progress?: Array<{
    id: string;
    action_taken: string;
    outcome: string | null;
    progress_delta: number | null;
    created_at: string;
  }>;
}

const goalTypeIcons: Record<string, typeof Target> = {
  fill_role: Target,
  increase_pipeline: TrendingUp,
  engage_company: Sparkles,
  default: Target,
};

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
  active: { color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: Play },
  paused: { color: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: Pause },
  completed: { color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: CheckCircle2 },
  failed: { color: "bg-rose-500/10 text-rose-500 border-rose-500/20", icon: AlertCircle },
};

export function GoalsDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newGoalInput, setNewGoalInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const { data: goals, isLoading } = useQuery({
    queryKey: ['agent-goals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('agent_goals')
        .select(`
          *,
          agent_goal_progress(*)
        `)
        .eq('user_id', user.id)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as AgentGoal[];
    },
    enabled: !!user?.id,
  });

  const createGoalMutation = useMutation({
    mutationFn: async (goalDescription: string) => {
      // Call the agent orchestrator to parse and create the goal
      const { data, error } = await supabase.functions.invoke('agent-orchestrator', {
        body: {
          operation: 'create_goal',
          userId: user?.id,
          data: {
            goalDescription,
            source: 'user_input'
          }
        }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-goals'] });
      setNewGoalInput("");
      setIsCreating(false);
      toast.success("Goal created! QUIN is now working on it.");
    },
    onError: (error) => {
      toast.error("Failed to create goal: " + error.message);
    }
  });

  const updateGoalStatusMutation = useMutation({
    mutationFn: async ({ goalId, status }: { goalId: string; status: string }) => {
      const { error } = await supabase
        .from('agent_goals')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', goalId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-goals'] });
      toast.success("Goal status updated");
    }
  });

  const handleCreateGoal = () => {
    if (!newGoalInput.trim()) return;
    createGoalMutation.mutate(newGoalInput);
  };

  const activeGoals = goals?.filter(g => g.status === 'active') || [];
  const completedGoals = goals?.filter(g => g.status === 'completed') || [];
  const pausedGoals = goals?.filter(g => g.status === 'paused') || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card variant="static">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
            <Target className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeGoals.length}</div>
            <p className="text-xs text-muted-foreground">QUIN is working on these</p>
          </CardContent>
        </Card>

        <Card variant="static">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedGoals.length}</div>
            <p className="text-xs text-muted-foreground">Goals achieved</p>
          </CardContent>
        </Card>

        <Card variant="static">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Hold</CardTitle>
            <Pause className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pausedGoals.length}</div>
            <p className="text-xs text-muted-foreground">Waiting for action</p>
          </CardContent>
        </Card>
      </div>

      {/* Create New Goal */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Create a New Goal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="e.g., Fill the Senior PM role within 30 days..."
              value={newGoalInput}
              onChange={(e) => setNewGoalInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateGoal()}
              className="flex-1"
            />
            <Button 
              onClick={handleCreateGoal}
              disabled={!newGoalInput.trim() || createGoalMutation.isPending}
            >
              {createGoalMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⟳</span> Creating...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Create Goal
                </span>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Describe what you want to achieve. QUIN will create an execution plan and start working on it.
          </p>
        </CardContent>
      </Card>

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Play className="h-5 w-5 text-emerald-500" />
            Active Goals
          </h3>
          <div className="space-y-4">
            {activeGoals.map((goal) => (
              <GoalCard 
                key={goal.id} 
                goal={goal} 
                onUpdateStatus={(status) => updateGoalStatusMutation.mutate({ goalId: goal.id, status })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Paused Goals */}
      {pausedGoals.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Pause className="h-5 w-5 text-amber-500" />
            Paused Goals
          </h3>
          <div className="space-y-4">
            {pausedGoals.map((goal) => (
              <GoalCard 
                key={goal.id} 
                goal={goal} 
                onUpdateStatus={(status) => updateGoalStatusMutation.mutate({ goalId: goal.id, status })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {goals?.length === 0 && (
        <Card variant="static" className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No goals yet</h3>
            <p className="text-muted-foreground max-w-md">
              Create your first goal and let QUIN help you achieve it. 
              Simply describe what you want to accomplish.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function GoalCard({ 
  goal, 
  onUpdateStatus 
}: { 
  goal: AgentGoal; 
  onUpdateStatus: (status: string) => void;
}) {
  const Icon = goalTypeIcons[goal.goal_type] || goalTypeIcons.default;
  const config = statusConfig[goal.status] || statusConfig.active;
  const StatusIcon = config.icon;
  const progressPercent = (goal.current_progress || 0) * 100;
  const recentProgress = goal.agent_goal_progress?.slice(0, 3) || [];

  return (
    <Card variant="interactive">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold truncate">{goal.goal_description}</h4>
                <Badge variant="outline" className={config.color}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {goal.status}
                </Badge>
              </div>
              
              {/* Progress Bar */}
              <div className="space-y-1 mb-3">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>{progressPercent.toFixed(0)}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>

              {/* Meta Info */}
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                {goal.deadline && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Due {format(new Date(goal.deadline), 'MMM d, yyyy')}
                  </span>
                )}
                {goal.next_action_at && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Next action {formatDistanceToNow(new Date(goal.next_action_at), { addSuffix: true })}
                  </span>
                )}
              </div>

              {/* Next Action Description */}
              {goal.next_action_description && (
                <div className="mt-2 p-2 rounded-lg bg-muted/50 text-sm">
                  <span className="text-muted-foreground">Next: </span>
                  {goal.next_action_description}
                </div>
              )}

              {/* Recent Progress */}
              {recentProgress.length > 0 && (
                <div className="mt-3 space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">Recent Activity</span>
                  {recentProgress.map((progress) => (
                    <div key={progress.id} className="flex items-start gap-2 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      <div>
                        <span>{progress.action_taken}</span>
                        {progress.outcome && (
                          <span className="text-muted-foreground"> → {progress.outcome}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {goal.status === 'active' && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => onUpdateStatus('paused')}
                title="Pause goal"
              >
                <Pause className="h-4 w-4" />
              </Button>
            )}
            {goal.status === 'paused' && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => onUpdateStatus('active')}
                title="Resume goal"
              >
                <Play className="h-4 w-4" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => onUpdateStatus('completed')}
              title="Mark as completed"
            >
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

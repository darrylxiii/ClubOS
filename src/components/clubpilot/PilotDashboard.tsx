import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Clock, CheckCircle2, Circle, PlayCircle, Pause, Settings, Calendar, Zap, Target, GitBranch, Bot } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface PilotTask {
  id: string;
  task_type: string;
  title: string;
  description: string | null;
  priority_score: number | null;
  impact_score: number | null;
  urgency_score: number | null;
  effort_minutes: number | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  ai_recommendation: string | null;
  status: string;
  context: any;
  created_at: string;
}

interface AgentGoal {
  id: string;
  goal_type: string;
  goal_description: string;
  status: string;
  current_progress: number;
  assigned_agents: string[];
  next_action_description: string | null;
  deadline: string | null;
}

interface AgentDelegation {
  id: string;
  parent_agent: string;
  child_agent: string;
  task_description: string;
  status: string;
  delegated_at: string;
}

const taskTypeConfig: Record<string, { label: string; icon: typeof Target; color: string }> = {
  review_candidate: { label: "Review Candidate", icon: Target, color: "text-blue-500" },
  schedule_interview: { label: "Schedule Interview", icon: Calendar, color: "text-purple-500" },
  prepare_interview: { label: "Prep Interview", icon: Zap, color: "text-orange-500" },
  send_update: { label: "Send Update", icon: Clock, color: "text-green-500" },
  follow_up: { label: "Follow Up", icon: CheckCircle2, color: "text-teal-500" },
  review_application: { label: "Review Application", icon: Target, color: "text-indigo-500" },
  send_offer: { label: "Send Offer", icon: Sparkles, color: "text-gold-500" },
};

const agentConfig: Record<string, { label: string; color: string }> = {
  quin: { label: "QUIN", color: "bg-primary/20 text-primary" },
  sourcing_agent: { label: "Sourcing", color: "bg-blue-500/20 text-blue-500" },
  interview_agent: { label: "Interview", color: "bg-purple-500/20 text-purple-500" },
  engagement_agent: { label: "Engagement", color: "bg-green-500/20 text-green-500" },
  analytics_agent: { label: "Analytics", color: "bg-orange-500/20 text-orange-500" },
};

export const PilotDashboard = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<PilotTask[]>([]);
  const [goals, setGoals] = useState<AgentGoal[]>([]);
  const [delegations, setDelegations] = useState<AgentDelegation[]>([]);
  const [loading, setLoading] = useState(true);
  const [orchestrating, setOrchestrating] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
      subscribeToUpdates();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const [tasksRes, goalsRes, delegationsRes] = await Promise.all([
        supabase
          .from("pilot_tasks")
          .select("*")
          .eq("user_id", user.id)
          .in("status", ["pending", "scheduled", "in_progress"])
          .order("priority_score", { ascending: false })
          .order("scheduled_start", { ascending: true, nullsFirst: false }),
        supabase
          .from("agent_goals")
          .select("*")
          .eq("user_id", user.id)
          .in("status", ["active", "in_progress"])
          .order("priority", { ascending: false })
          .limit(5),
        supabase
          .from("agent_delegations")
          .select("*")
          .eq("user_id", user.id)
          .in("status", ["pending", "in_progress"])
          .order("delegated_at", { ascending: false })
          .limit(10),
      ]);

      if (tasksRes.error) throw tasksRes.error;
      if (goalsRes.error) throw goalsRes.error;
      if (delegationsRes.error) throw delegationsRes.error;

      setTasks(tasksRes.data || []);
      setGoals(goalsRes.data || []);
      setDelegations(delegationsRes.data || []);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const subscribeToUpdates = () => {
    const channel = supabase
      .channel("pilot_dashboard_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pilot_tasks",
          filter: `user_id=eq.${user?.id}`,
        },
        () => loadData()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agent_goals",
          filter: `user_id=eq.${user?.id}`,
        },
        () => loadData()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agent_delegations",
          filter: `user_id=eq.${user?.id}`,
        },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const runOrchestrator = async () => {
    setOrchestrating(true);
    try {
      const { data, error } = await supabase.functions.invoke("club-pilot-orchestrator", {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      toast.success(`🚀 Club Pilot analyzed your pipeline and created ${data.tasks_created} tasks`, {
        description: `${data.tasks_scheduled} tasks auto-scheduled`,
      });

      await loadData();
    } catch (error: any) {
      console.error("Error running orchestrator:", error);
      toast.error(error.message || "Failed to run Club Pilot");
    } finally {
      setOrchestrating(false);
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("pilot_tasks")
        .update({ 
          status,
          completed_at: status === "completed" ? new Date().toISOString() : null,
        })
        .eq("id", taskId)
        .eq("user_id", user?.id);

      if (error) throw error;

      toast.success(status === "completed" ? "Task completed!" : "Task updated");
      await loadData();
    } catch (error: any) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    }
  };

  const scheduledTasks = tasks.filter(t => t.status === "scheduled" && t.scheduled_start);
  const pendingTasks = tasks.filter(t => t.status === "pending" || !t.scheduled_start);
  const inProgressTasks = tasks.filter(t => t.status === "in_progress");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Club Pilot</CardTitle>
                <CardDescription className="text-base">
                  AI-powered task orchestration • Auto-prioritization • Smart scheduling
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button 
                onClick={runOrchestrator} 
                disabled={orchestrating}
                size="sm"
                className="bg-primary hover:bg-primary/90"
              >
                {orchestrating ? (
                  <>
                    <div className="animate-spin mr-2">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Run Pilot
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Agent Goals & Delegations */}
      {(goals.length > 0 || delegations.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Goals */}
          {goals.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5 text-primary" />
                  Active Goals
                </CardTitle>
                <CardDescription>AI-driven objectives in progress</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {goals.map((goal) => (
                    <motion.div
                      key={goal.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 rounded-lg border bg-card"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {goal.goal_type}
                            </Badge>
                            {goal.assigned_agents?.map((agent) => {
                              const config = agentConfig[agent] || { label: agent, color: "bg-muted text-muted-foreground" };
                              return (
                                <Badge key={agent} className={cn("text-[10px]", config.color)}>
                                  {config.label}
                                </Badge>
                              );
                            })}
                          </div>
                          <p className="text-sm font-medium">{goal.goal_description}</p>
                          {goal.next_action_description && (
                            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                              <Sparkles className="h-3 w-3 text-primary" />
                              Next: {goal.next_action_description}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-primary">{Math.round((goal.current_progress || 0) * 100)}%</span>
                        </div>
                      </div>
                      <Progress value={(goal.current_progress || 0) * 100} className="mt-3 h-2" />
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Agent Delegations */}
          {delegations.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <GitBranch className="h-5 w-5 text-purple-500" />
                  Agent Activity
                </CardTitle>
                <CardDescription>Sub-tasks delegated between agents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <AnimatePresence>
                    {delegations.map((delegation, index) => {
                      const parentConfig = agentConfig[delegation.parent_agent] || { label: delegation.parent_agent, color: "bg-muted" };
                      const childConfig = agentConfig[delegation.child_agent] || { label: delegation.child_agent, color: "bg-muted" };
                      
                      return (
                        <motion.div
                          key={delegation.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                        >
                          <div className={cn("p-1.5 rounded", parentConfig.color)}>
                            <Bot className="h-3 w-3" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{delegation.task_description}</p>
                            <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                              <span>{parentConfig.label}</span>
                              <span>→</span>
                              <Badge className={cn("text-[10px] px-1", childConfig.color)}>
                                {childConfig.label}
                              </Badge>
                            </div>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-[10px]",
                              delegation.status === "in_progress" && "border-blue-500/50 text-blue-500",
                              delegation.status === "pending" && "border-yellow-500/50 text-yellow-500"
                            )}
                          >
                            {delegation.status}
                          </Badge>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Scheduled Today</CardDescription>
            <CardTitle className="text-3xl">{scheduledTasks.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>In Progress</CardDescription>
            <CardTitle className="text-3xl">{inProgressTasks.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-3xl">{pendingTasks.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Active</CardDescription>
            <CardTitle className="text-3xl">{tasks.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Task Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scheduled Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Scheduled Tasks
            </CardTitle>
            <CardDescription>Auto-scheduled by Club Pilot</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-3">
                {scheduledTasks.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No scheduled tasks. Run Club Pilot to auto-schedule your tasks.
                  </p>
                ) : (
                  scheduledTasks.map((task) => <TaskCard key={task.id} task={task} onUpdateStatus={updateTaskStatus} />)
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Circle className="h-5 w-5" />
              Pending Tasks
            </CardTitle>
            <CardDescription>Awaiting scheduling</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-3">
                {pendingTasks.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    All tasks are scheduled! Great job! 🎉
                  </p>
                ) : (
                  pendingTasks.map((task) => <TaskCard key={task.id} task={task} onUpdateStatus={updateTaskStatus} />)
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const TaskCard = ({ task, onUpdateStatus }: { task: PilotTask; onUpdateStatus: (id: string, status: string) => void }) => {
  const config = taskTypeConfig[task.task_type as keyof typeof taskTypeConfig] || taskTypeConfig.review_candidate;
  const Icon = config.icon;

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="pt-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3 flex-1">
              <div className={cn("p-2 bg-background/50 rounded", config.color)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm truncate">{task.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">{config.label}</p>
              </div>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {Math.round(task.priority_score * 10) / 10}
            </Badge>
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
          )}

          {/* AI Recommendation */}
          {task.ai_recommendation && (
            <div className="bg-primary/5 border border-primary/10 rounded p-2">
              <div className="flex items-start gap-2">
                <Sparkles className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-foreground/80">{task.ai_recommendation}</p>
              </div>
            </div>
          )}

          {/* Schedule Info */}
          {task.scheduled_start && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                {new Date(task.scheduled_start).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
              <span>•</span>
              <span>{task.effort_minutes} min</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {task.status === "pending" && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => onUpdateStatus(task.id, "in_progress")}
              >
                <PlayCircle className="h-3 w-3 mr-1" />
                Start
              </Button>
            )}
            {task.status === "in_progress" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onUpdateStatus(task.id, "completed")}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Complete
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onUpdateStatus(task.id, "pending")}
                >
                  <Pause className="h-3 w-3" />
                </Button>
              </>
            )}
            {task.status === "scheduled" && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => onUpdateStatus(task.id, "in_progress")}
              >
                <PlayCircle className="h-3 w-3 mr-1" />
                Start Now
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

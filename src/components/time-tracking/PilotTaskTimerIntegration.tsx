import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { PlayCircle, Clock, Sparkles, Target, Calendar, Zap, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PilotTask {
  id: string;
  task_type: string;
  title: string;
  description: string | null;
  priority_score: number;
  effort_minutes: number;
  scheduled_start: string | null;
  ai_recommendation: string | null;
  status: string;
}

const taskTypeConfig: Record<string, { label: string; icon: any; color: string }> = {
  review_candidate: { label: "Review Candidate", icon: Target, color: "text-blue-500" },
  schedule_interview: { label: "Schedule Interview", icon: Calendar, color: "text-purple-500" },
  prepare_interview: { label: "Prep Interview", icon: Zap, color: "text-orange-500" },
  send_update: { label: "Send Update", icon: Clock, color: "text-green-500" },
  follow_up: { label: "Follow Up", icon: CheckCircle2, color: "text-teal-500" },
  review_application: { label: "Review Application", icon: Target, color: "text-indigo-500" },
  send_offer: { label: "Send Offer", icon: Sparkles, color: "text-amber-500" },
};

export function PilotTaskTimerIntegration() {
  const { user } = useAuth();
  const { startTimer, runningEntry } = useTimeTracking();
  const [startingTaskId, setStartingTaskId] = useState<string | null>(null);

  // Fetch pending/scheduled pilot tasks
  const { data: pilotTasks = [] } = useQuery({
    queryKey: ['pilot-tasks-for-timer', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('pilot_tasks')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['pending', 'scheduled'])
        .order('priority_score', { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data || []) as PilotTask[];
    },
    enabled: !!user?.id,
  });

  const handleStartTaskTimer = async (task: PilotTask) => {
    setStartingTaskId(task.id);
    try {
      // Start timer with pilot_task_id linked
      await startTimer.mutateAsync({
        description: task.title,
        is_billable: false, // Club Pilot tasks are typically internal
      });

      // Update the time entry with pilot_task_id (the trigger will update task status)
      // Note: This is a workaround since startTimer doesn't support pilot_task_id directly
      const { data: latestEntry } = await supabase
        .from('time_entries')
        .select('id')
        .eq('user_id', user?.id)
        .eq('is_running', true)
        .single();

      if (latestEntry) {
        await supabase
          .from('time_entries')
          .update({ pilot_task_id: task.id })
          .eq('id', latestEntry.id);
      }

      toast.success(`Started timer for: ${task.title}`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to start timer');
    } finally {
      setStartingTaskId(null);
    }
  };

  if (pilotTasks.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          Club Pilot Tasks
        </CardTitle>
        <CardDescription>
          Start a timer linked to your AI-prioritized tasks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {pilotTasks.map((task) => {
              const config = taskTypeConfig[task.task_type] || taskTypeConfig.review_candidate;
              const Icon = config.icon;
              const isStarting = startingTaskId === task.id;
              const isRunning = runningEntry?.pilot_task_id === task.id;

              return (
                <div 
                  key={task.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                    isRunning ? "bg-primary/10 border-primary/30" : "bg-muted/30 hover:bg-muted/50"
                  )}
                >
                  <div className={cn("p-2 rounded", config.color, "bg-background/50")}>
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm truncate">{task.title}</h4>
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {Math.round(task.priority_score * 10) / 10}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{config.label}</p>
                    
                    {task.ai_recommendation && (
                      <div className="mt-2 p-2 bg-primary/5 rounded text-xs text-muted-foreground flex items-start gap-1.5">
                        <Sparkles className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{task.ai_recommendation}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>~{task.effort_minutes} min</span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={isRunning ? "secondary" : "outline"}
                    disabled={isStarting || !!runningEntry}
                    onClick={() => handleStartTaskTimer(task)}
                    className="shrink-0"
                  >
                    {isRunning ? (
                      <>
                        <span className="relative flex h-2 w-2 mr-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        Running
                      </>
                    ) : (
                      <>
                        <PlayCircle className="h-3.5 w-3.5 mr-1" />
                        Start
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
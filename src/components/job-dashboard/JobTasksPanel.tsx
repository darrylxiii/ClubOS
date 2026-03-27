import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Circle, Clock, Plus, Loader2 } from "lucide-react";
import { CreateUnifiedTaskDialog } from "@/components/unified-tasks/CreateUnifiedTaskDialog";
import { PartnerTaskRequestDialog } from "./PartnerTaskRequestDialog";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { useTranslation } from 'react-i18next';

interface JobTasksPanelProps {
  jobId: string;
  companyId?: string;
  jobTitle?: string;
}

export const JobTasksPanel = ({ jobId, companyId, jobTitle }: JobTasksPanelProps) => {
  const { t } = useTranslation('jobs');
  const { currentRole } = useRole();
  const queryClient = useQueryClient();
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showPartnerRequest, setShowPartnerRequest] = useState(false);
  const isPartner = currentRole === "partner";
  const isAdmin = currentRole === "admin" || currentRole === "strategist";

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["job-tasks", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unified_tasks")
        .select(`
          id, title, description, status, priority, due_date, task_type, created_at,
          assignees:unified_task_assignees(
            user_id,
            profiles(full_name, avatar_url)
          )
        `)
        .eq("job_id", jobId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Realtime subscription for live task updates
  useEffect(() => {
    const channel = supabase
      .channel(`job-tasks-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'unified_tasks',
          filter: `job_id=eq.${jobId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["job-tasks", jobId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, queryClient]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      const { error } = await supabase
        .from("unified_tasks")
        .update({
          status,
          updated_at: new Date().toISOString(),
          completed_at: status === "completed" ? new Date().toISOString() : null,
        })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-tasks", jobId] });
      toast.success("Task updated");
    },
  });

  const pendingTasks = tasks.filter((t: any) => t.status === "pending");
  const inProgressTasks = tasks.filter((t: any) => t.status === "in_progress");
  const completedTasks = tasks.filter((t: any) => t.status === "completed");

  const priorityColor = (p: string) => {
    switch (p) {
      case "high": return "text-destructive bg-destructive/10 border-destructive/20";
      case "medium": return "text-warning bg-warning/10 border-warning/20";
      default: return "text-muted-foreground bg-muted/30 border-border/20";
    }
  };

  const renderTask = (task: any) => (
    <div
      key={task.id}
      className="flex items-start gap-3 p-3 rounded-lg border border-border/20 bg-card/30 hover:bg-card/50 transition-colors group"
    >
      <button
        onClick={() =>
          updateStatusMutation.mutate({
            taskId: task.id,
            status: task.status === "completed" ? "pending" : "completed",
          })
        }
        className="mt-0.5 shrink-0"
      >
        {task.status === "completed" ? (
          <CheckCircle2 className="h-4 w-4 text-primary" />
        ) : task.status === "in_progress" ? (
          <Clock className="h-4 w-4 text-warning" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        )}
      </button>
      <div className="flex-1 min-w-0 space-y-1">
        <p className={`text-sm font-medium leading-tight ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-[10px] px-1.5 h-4 ${priorityColor(task.priority)}`}>
            {task.priority}
          </Badge>
          {task.task_type === "partner_request" && (
            <Badge variant="outline" className="text-[10px] px-1.5 h-4 text-accent bg-accent/10 border-accent/20">
              Partner Request
            </Badge>
          )}
          {task.due_date && (
            <span className="text-[10px] text-muted-foreground">
              Due {format(new Date(task.due_date), "MMM d")}
            </span>
          )}
        </div>
        {task.assignees?.length > 0 && (
          <div className="flex items-center gap-1">
            {task.assignees.slice(0, 3).map((a: any) => (
              <span key={a.user_id} className="text-[10px] text-muted-foreground">
                {a.profiles?.full_name?.split(" ")[0]}
              </span>
            ))}
          </div>
        )}
      </div>
      {isAdmin && task.status !== "completed" && task.status !== "in_progress" && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => updateStatusMutation.mutate({ taskId: task.id, status: "in_progress" })}
        >
          Start
        </Button>
      )}
    </div>
  );

  return (
    <Card className="border-border/20 bg-card/20 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">
            Tasks
            {tasks.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 text-[10px]">
                {completedTasks.length}/{tasks.length}
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            {isPartner && (
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowPartnerRequest(true)}>
                <Plus className="h-3 w-3 mr-1" />
                Request Task
              </Button>
            )}
            {isAdmin && (
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowCreateTask(true)}>
                <Plus className="h-3 w-3 mr-1" />
                Add Task
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No tasks linked to this job yet.</p>
        ) : (
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="w-full justify-start bg-transparent p-0 h-auto gap-2 mb-3">
              <TabsTrigger value="pending" className="text-xs h-7 data-[state=active]:bg-muted/30 rounded-md px-3">
                Pending ({pendingTasks.length})
              </TabsTrigger>
              <TabsTrigger value="in_progress" className="text-xs h-7 data-[state=active]:bg-muted/30 rounded-md px-3">
                In Progress ({inProgressTasks.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="text-xs h-7 data-[state=active]:bg-muted/30 rounded-md px-3">
                Done ({completedTasks.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className="space-y-2 mt-0">
              {pendingTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No pending tasks.</p>
              ) : pendingTasks.map(renderTask)}
            </TabsContent>
            <TabsContent value="in_progress" className="space-y-2 mt-0">
              {inProgressTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No tasks in progress.</p>
              ) : inProgressTasks.map(renderTask)}
            </TabsContent>
            <TabsContent value="completed" className="space-y-2 mt-0">
              {completedTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No completed tasks.</p>
              ) : completedTasks.map(renderTask)}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>

      {/* Admin create task dialog - pre-filled with job context */}
      <CreateUnifiedTaskDialog
        objectiveId={null}
        open={showCreateTask}
        onOpenChange={setShowCreateTask}
        onTaskCreated={() => {
          setShowCreateTask(false);
          queryClient.invalidateQueries({ queryKey: ["job-tasks", jobId] });
        }}
        initialTitle=""
        jobId={jobId}
        companyId={companyId}
        jobTitle={jobTitle}
      >
        <span />
      </CreateUnifiedTaskDialog>

      {/* Partner request dialog */}
      <PartnerTaskRequestDialog
        open={showPartnerRequest}
        onClose={() => setShowPartnerRequest(false)}
        jobId={jobId}
        companyId={companyId}
        jobTitle={jobTitle}
        onTaskCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["job-tasks", jobId] });
        }}
      />
    </Card>
  );
};

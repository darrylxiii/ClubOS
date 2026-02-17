import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Clock,
  Calendar,
  Circle,
  Lock,
  Link2,
  CircleCheck,
  CheckSquare,
  MessageSquare,
  User,
  ArrowUpDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { CreateUnifiedTaskDialog } from "./CreateUnifiedTaskDialog";
import { UnifiedTaskDetailSheet } from "./UnifiedTaskDetailSheet";
import { useTaskCompletion } from "@/hooks/useTaskCompletion";
import { TaskCompletionFeedbackModal } from "./TaskCompletionFeedbackModal";
import { TaskCardSkeleton } from "./TaskCardSkeleton";
import { computeUrgency } from "@/lib/taskUrgency";
import { cn } from "@/lib/utils";

interface UnifiedTask {
  id: string;
  task_number: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  scheduled_start: string | null;
  auto_scheduled: boolean;
  task_type: string;
  blockingCount?: number;
  blockedByCount?: number;
  subtaskCount?: number;
  subtaskCompleted?: number;
  commentCount?: number;
  assignees?: Array<{
    user_id: string;
    profiles: { full_name: string; avatar_url: string | null };
  }>;
}

interface UnifiedTasksListProps {
  objectiveId: string | null;
  onRefresh: () => void;
  aiSchedulingEnabled: boolean;
}

const STATUS_OPTIONS = ["pending", "in_progress", "on_hold", "completed", "cancelled"];
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-rose-500",
  in_progress: "bg-amber-500",
  on_hold: "bg-blue-500",
  completed: "bg-emerald-500",
  cancelled: "bg-muted-foreground",
};

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-destructive",
  medium: "bg-amber-500",
  low: "bg-emerald-500",
};

export const UnifiedTasksList = ({
  objectiveId,
  onRefresh,
  aiSchedulingEnabled,
}: UnifiedTasksListProps) => {
  const [tasks, setTasks] = useState<UnifiedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<UnifiedTask | null>(null);

  const { requestComplete, feedbackModalProps } = useTaskCompletion({
    onCompleted: () => { loadTasks(); onRefresh(); },
  });

  useEffect(() => { loadTasks(); }, [objectiveId]);

  const loadTasks = async () => {
    try {
      let query = supabase
        .from("unified_tasks")
        .select(`*, assignees:unified_task_assignees(user_id, profiles(full_name, avatar_url))`)
        .order("created_at", { ascending: false });

      if (objectiveId) query = query.eq("objective_id", objectiveId);

      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        const taskIds = data.map((t) => t.id);
        const [{ data: bc }, { data: bbc }, { data: sr }, { data: cr }] = await Promise.all([
          supabase.from("task_dependencies").select("depends_on_task_id").in("depends_on_task_id", taskIds),
          supabase.from("task_dependencies").select("task_id").in("task_id", taskIds),
          (supabase.from("unified_tasks") as any).select("parent_task_id, status").in("parent_task_id", taskIds),
          supabase.from("task_comments").select("task_id").in("task_id", taskIds),
        ]);

        const bMap = new Map<string, number>();
        bc?.forEach((r) => bMap.set(r.depends_on_task_id, (bMap.get(r.depends_on_task_id) || 0) + 1));
        const bbMap = new Map<string, number>();
        bbc?.forEach((r) => bbMap.set(r.task_id, (bbMap.get(r.task_id) || 0) + 1));
        const scMap = new Map<string, number>();
        const sdMap = new Map<string, number>();
        sr?.forEach((r: any) => {
          scMap.set(r.parent_task_id, (scMap.get(r.parent_task_id) || 0) + 1);
          if (r.status === "completed") sdMap.set(r.parent_task_id, (sdMap.get(r.parent_task_id) || 0) + 1);
        });
        const ccMap = new Map<string, number>();
        cr?.forEach((r: any) => ccMap.set(r.task_id, (ccMap.get(r.task_id) || 0) + 1));

        const enriched = data.map((t) => ({
          ...t,
          blockingCount: bMap.get(t.id) || 0,
          blockedByCount: bbMap.get(t.id) || 0,
          subtaskCount: scMap.get(t.id) || 0,
          subtaskCompleted: sdMap.get(t.id) || 0,
          commentCount: ccMap.get(t.id) || 0,
        }));

        // Sort by urgency
        enriched.sort((a, b) => computeUrgency(b) - computeUrgency(a));
        setTasks(enriched as UnifiedTask[]);
      } else {
        setTasks((data as UnifiedTask[]) || []);
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const cycleStatus = async (task: UnifiedTask) => {
    const idx = STATUS_OPTIONS.indexOf(task.status);
    const next = STATUS_OPTIONS[(idx + 1) % STATUS_OPTIONS.length];

    if (next === "completed") {
      requestComplete(task.id, task.title);
      return;
    }

    setTasks((p) => p.map((t) => (t.id === task.id ? { ...t, status: next } : t)));
    const { error } = await supabase.from("unified_tasks").update({ status: next, completed_at: null }).eq("id", task.id);
    if (error) { toast.error("Failed"); loadTasks(); return; }
    toast.success(`Status → ${next.replace("_", " ")}`);
    loadTasks();
    onRefresh();
  };

  if (loading) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 6 }).map((_, i) => <TaskCardSkeleton key={i} variant="list" />)}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Circle className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-3">No tasks yet</p>
          <CreateUnifiedTaskDialog objectiveId={objectiveId} onTaskCreated={() => { loadTasks(); onRefresh(); }}>
            <Button size="sm">Create Task</Button>
          </CreateUnifiedTaskDialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-0">
      {/* Table header */}
      <div className="grid grid-cols-[auto_auto_1fr_auto_auto_auto_auto] gap-3 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground border-b border-border/30">
        <span className="w-5" />
        <span className="w-5" />
        <span>Task</span>
        <span className="w-20 text-center hidden sm:block">Due</span>
        <span className="w-16 text-center hidden md:block">Blockers</span>
        <span className="w-8 text-center hidden md:block">
          <MessageSquare className="h-3 w-3 mx-auto" />
        </span>
        <span className="w-6" />
      </div>

      {/* Rows */}
      {tasks.map((task) => {
        const dueDate = task.due_date ? new Date(task.due_date) : null;
        const isOverdue = dueDate && isPast(dueDate) && task.status !== "completed";
        const isDueToday = dueDate && isToday(dueDate);
        const blockedBy = task.blockedByCount ?? 0;
        const blocking = task.blockingCount ?? 0;

        return (
          <div
            key={task.id}
            className={cn(
              "grid grid-cols-[auto_auto_1fr_auto_auto_auto_auto] gap-3 px-3 py-2 items-center border-b border-border/10 cursor-pointer transition-colors hover:bg-muted/30",
              isOverdue && "bg-destructive/5"
            )}
            onClick={() => setSelectedTask(task)}
          >
            {/* Status dot (clickable to cycle) */}
            <button
              onClick={(e) => { e.stopPropagation(); cycleStatus(task); }}
              className="w-5 flex items-center justify-center"
              title={`Status: ${task.status.replace("_", " ")}`}
            >
              <div className={cn("h-2.5 w-2.5 rounded-full transition-colors", STATUS_COLORS[task.status] || "bg-muted-foreground")} />
            </button>

            {/* Priority dot */}
            <div className="w-5 flex items-center justify-center">
              <div className={cn("h-2 w-2 rounded-full", PRIORITY_DOT[task.priority] || PRIORITY_DOT.low)} title={`${task.priority} priority`} />
            </div>

            {/* Title + task number */}
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm text-foreground truncate">{task.title}</span>
              <span className="text-[10px] text-muted-foreground/50 font-mono shrink-0">{task.task_number}</span>
              {(task.subtaskCount ?? 0) > 0 && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 shrink-0">
                  <CheckSquare className="h-3 w-3" />
                  {task.subtaskCompleted}/{task.subtaskCount}
                </span>
              )}
            </div>

            {/* Due date */}
            <div className="w-20 text-center hidden sm:block">
              {dueDate ? (
                <span className={cn(
                  "text-[10px]",
                  isOverdue && "text-destructive font-medium",
                  isDueToday && !isOverdue && "text-amber-500",
                )}>
                  {isOverdue ? "Overdue" : isDueToday ? "Today" : format(dueDate, "MMM d")}
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground/30">—</span>
              )}
            </div>

            {/* Blockers */}
            <div className="w-16 flex items-center justify-center gap-1.5 hidden md:flex">
              {blockedBy > 0 && (
                <span className="text-[10px] text-destructive flex items-center gap-0.5">
                  <Lock className="h-3 w-3" />{blockedBy}
                </span>
              )}
              {blocking > 0 && (
                <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
                  <Link2 className="h-3 w-3" />{blocking}
                </span>
              )}
              {blockedBy === 0 && blocking === 0 && (
                <span className="text-[10px] text-muted-foreground/30">—</span>
              )}
            </div>

            {/* Comments */}
            <div className="w-8 text-center hidden md:block">
              {(task.commentCount ?? 0) > 0 ? (
                <span className="text-[10px] text-muted-foreground">{task.commentCount}</span>
              ) : (
                <span className="text-[10px] text-muted-foreground/30">—</span>
              )}
            </div>

            {/* Assignee */}
            <div className="w-6">
              {task.assignees && task.assignees.length > 0 ? (
                <Avatar className="h-5 w-5 border border-border/50">
                  <AvatarImage src={task.assignees[0].profiles?.avatar_url} />
                  <AvatarFallback className="text-[8px]">
                    {task.assignees[0].profiles?.full_name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="h-5 w-5 rounded-full bg-muted/30 border border-dashed border-muted-foreground/20 flex items-center justify-center">
                  <User className="h-2.5 w-2.5 text-muted-foreground/40" />
                </div>
              )}
            </div>
          </div>
        );
      })}

      {selectedTask && (
        <UnifiedTaskDetailSheet
          task={selectedTask}
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={() => { loadTasks(); onRefresh(); }}
          onStatusChange={async (id, status) => {
            if (status === "completed") { requestComplete(id, selectedTask.title); return; }
            await supabase.from("unified_tasks").update({ status, completed_at: null }).eq("id", id);
            loadTasks(); onRefresh();
          }}
        />
      )}

      <TaskCompletionFeedbackModal {...feedbackModalProps} />
    </div>
  );
};

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Circle,
  Lock,
  Link2,
  CheckSquare,
  MessageSquare,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, isPast, isToday } from "date-fns";
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
const STATUS_DOT: Record<string, string> = {
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

type SortKey = "urgency" | "title" | "due_date" | "priority" | "status";

export const UnifiedTasksList = ({
  objectiveId,
  onRefresh,
}: UnifiedTasksListProps) => {
  const [tasks, setTasks] = useState<UnifiedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<UnifiedTask | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("urgency");
  const [sortAsc, setSortAsc] = useState(false);

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

        setTasks(data.map((t) => ({
          ...t,
          blockingCount: bMap.get(t.id) || 0,
          blockedByCount: bbMap.get(t.id) || 0,
          subtaskCount: scMap.get(t.id) || 0,
          subtaskCompleted: sdMap.get(t.id) || 0,
          commentCount: ccMap.get(t.id) || 0,
        })) as UnifiedTask[]);
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
    if (next === "completed") { requestComplete(task.id, task.title); return; }
    setTasks((p) => p.map((t) => (t.id === task.id ? { ...t, status: next } : t)));
    const { error } = await supabase.from("unified_tasks").update({ status: next, completed_at: null }).eq("id", task.id);
    if (error) { toast.error("Failed"); loadTasks(); return; }
    toast.success(`Status → ${next.replace("_", " ")}`);
    loadTasks(); onRefresh();
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(key === "title"); }
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "urgency": cmp = computeUrgency(b) - computeUrgency(a); break;
      case "title": cmp = a.title.localeCompare(b.title); break;
      case "due_date": cmp = (a.due_date || "z").localeCompare(b.due_date || "z"); break;
      case "priority": { const o = { high: 0, medium: 1, low: 2 }; cmp = (o[a.priority as keyof typeof o] ?? 2) - (o[b.priority as keyof typeof o] ?? 2); break; }
      case "status": cmp = STATUS_OPTIONS.indexOf(a.status) - STATUS_OPTIONS.indexOf(b.status); break;
    }
    return sortAsc ? cmp : (sortKey === "urgency" ? cmp : -cmp);
  });

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-2.5 w-2.5 opacity-30" />;
    return sortAsc ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />;
  };

  if (loading) {
    return <div className="space-y-0">{Array.from({ length: 8 }).map((_, i) => <TaskCardSkeleton key={i} variant="list" />)}</div>;
  }

  if (tasks.length === 0) {
    return (
      <Card className="border-border/30">
        <CardContent className="py-10 text-center">
          <Circle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground mb-2">No tasks yet</p>
          <CreateUnifiedTaskDialog objectiveId={objectiveId} onTaskCreated={() => { loadTasks(); onRefresh(); }}>
            <Button size="sm" variant="outline" className="text-xs h-7">Create Task</Button>
          </CreateUnifiedTaskDialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="border border-border/20 rounded-lg overflow-hidden">
      {/* Sticky header */}
      <div className="grid grid-cols-[20px_16px_1fr_80px_60px_28px_24px] gap-2 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-muted/20 border-b border-border/20 sticky top-0 z-10">
        <button onClick={() => toggleSort("status")} className="flex items-center gap-0.5 hover:text-foreground transition-colors">
          S <SortIcon col="status" />
        </button>
        <button onClick={() => toggleSort("priority")} className="flex items-center gap-0.5 hover:text-foreground transition-colors">
          P <SortIcon col="priority" />
        </button>
        <button onClick={() => toggleSort("title")} className="flex items-center hover:text-foreground transition-colors">
          Task <SortIcon col="title" />
        </button>
        <button onClick={() => toggleSort("due_date")} className="flex items-center justify-end hover:text-foreground transition-colors hidden sm:flex">
          Due <SortIcon col="due_date" />
        </button>
        <span className="text-center hidden md:block">Deps</span>
        <span className="hidden md:block" />
        <span />
      </div>

      {/* Rows */}
      {sortedTasks.map((task, i) => {
        const dueDate = task.due_date ? new Date(task.due_date) : null;
        const isOverdue = dueDate && isPast(dueDate) && task.status !== "completed";
        const isDueToday = dueDate && isToday(dueDate);
        const blockedBy = task.blockedByCount ?? 0;
        const blocking = task.blockingCount ?? 0;

        return (
          <div
            key={task.id}
            className={cn(
              "grid grid-cols-[20px_16px_1fr_80px_60px_28px_24px] gap-2 px-3 py-1.5 items-center cursor-pointer transition-colors",
              "hover:bg-muted/30 border-b border-border/8",
              i % 2 === 1 && "bg-muted/5",
              isOverdue && "bg-destructive/[0.03]"
            )}
            onClick={() => setSelectedTask(task)}
          >
            {/* Status dot */}
            <button
              onClick={(e) => { e.stopPropagation(); cycleStatus(task); }}
              className="flex items-center justify-center group/status"
              title={`${task.status.replace("_", " ")} — click to cycle`}
            >
              <div className={cn("h-2.5 w-2.5 rounded-full transition-transform group-hover/status:scale-125", STATUS_DOT[task.status] || "bg-muted-foreground")} />
            </button>

            {/* Priority dot */}
            <div className="flex items-center justify-center">
              <div className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_DOT[task.priority] || PRIORITY_DOT.low)} />
            </div>

            {/* Title */}
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[13px] text-foreground truncate">{task.title}</span>
              {(task.subtaskCount ?? 0) > 0 && (
                <span className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5 shrink-0">
                  <CheckSquare className="h-2.5 w-2.5" />
                  {task.subtaskCompleted}/{task.subtaskCount}
                </span>
              )}
            </div>

            {/* Due date */}
            <div className="text-right hidden sm:block">
              {dueDate ? (
                <span className={cn("text-[11px]", isOverdue && "text-destructive font-medium", isDueToday && !isOverdue && "text-amber-500")}>
                  {isOverdue ? "Overdue" : isDueToday ? "Today" : format(dueDate, "MMM d")}
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground/20">—</span>
              )}
            </div>

            {/* Dependencies */}
            <div className="flex items-center justify-center gap-1 hidden md:flex">
              {blockedBy > 0 && (
                <span className="text-[10px] text-destructive flex items-center gap-0.5"><Lock className="h-2.5 w-2.5" />{blockedBy}</span>
              )}
              {blocking > 0 && (
                <span className="text-[10px] text-amber-500 flex items-center gap-0.5"><Link2 className="h-2.5 w-2.5" />{blocking}</span>
              )}
              {blockedBy === 0 && blocking === 0 && <span className="text-[11px] text-muted-foreground/15">—</span>}
            </div>

            {/* Comments */}
            <div className="text-center hidden md:block">
              {(task.commentCount ?? 0) > 0 ? (
                <span className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5"><MessageSquare className="h-2.5 w-2.5" />{task.commentCount}</span>
              ) : null}
            </div>

            {/* Assignee */}
            <div>
              {task.assignees && task.assignees.length > 0 ? (
                <Avatar className="h-5 w-5 border border-border/30">
                  <AvatarImage src={task.assignees[0].profiles?.avatar_url} />
                  <AvatarFallback className="text-[8px]">{task.assignees[0].profiles?.full_name?.charAt(0) || "?"}</AvatarFallback>
                </Avatar>
              ) : null}
            </div>
          </div>
        );
      })}

      {selectedTask && (
        <UnifiedTaskDetailSheet
          task={selectedTask} open={!!selectedTask} onClose={() => setSelectedTask(null)}
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

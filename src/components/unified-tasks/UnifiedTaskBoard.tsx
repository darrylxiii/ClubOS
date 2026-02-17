import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Hand,
  Rocket,
  Pause,
  CheckCircle2,
  XCircle,
  Lock,
  Link2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreateUnifiedTaskDialog } from "./CreateUnifiedTaskDialog";
import { UnifiedTaskDetailSheet } from "./UnifiedTaskDetailSheet";
import { TaskCardCompact } from "./TaskCardCompact";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useTaskCompletion } from "@/hooks/useTaskCompletion";
import { TaskCompletionFeedbackModal } from "./TaskCompletionFeedbackModal";
import { BoardColumnSkeleton } from "./TaskCardSkeleton";
import { useTaskKeyboardNav } from "@/hooks/useTaskKeyboardNav";
import { useUnifiedTasks } from "@/contexts/UnifiedTasksContext";
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
  auto_scheduled: boolean;
  scheduling_mode: string;
  scheduled_start: string | null;
  assignees?: Array<{
    user_id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  }>;
  blockingCount?: number;
  blockedByCount?: number;
  subtaskCount?: number;
  subtaskCompleted?: number;
  commentCount?: number;
  migration_status: string;
  project_id?: string;
  marketplace_projects?: { title: string };
}

interface UnifiedTaskBoardProps {
  objectiveId: string | null;
  objectiveName?: string;
  onRefresh: () => void;
  aiSchedulingEnabled: boolean;
}

const STATUS_COLUMNS = [
  { key: "pending", label: "Pending", icon: Hand, accent: "border-t-rose-500/60" },
  { key: "in_progress", label: "In Progress", icon: Rocket, accent: "border-t-amber-500/60" },
  { key: "on_hold", label: "On Hold", icon: Pause, accent: "border-t-blue-500/60" },
  { key: "completed", label: "Done", icon: CheckCircle2, accent: "border-t-emerald-500/60" },
  { key: "cancelled", label: "Cancelled", icon: XCircle, accent: "border-t-muted-foreground/40" },
];

export const UnifiedTaskBoard = ({
  objectiveId,
  objectiveName,
  onRefresh,
  aiSchedulingEnabled,
}: UnifiedTaskBoardProps) => {
  const [tasks, setTasks] = useState<UnifiedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<UnifiedTask | null>(null);
  const [activeTask, setActiveTask] = useState<UnifiedTask | null>(null);
  const { toggleTaskSelection, selectedTaskIds } = useUnifiedTasks();

  const allTaskIds = tasks.map((t) => t.id);
  const { focusedTaskId, containerRef } = useTaskKeyboardNav({
    taskIds: allTaskIds,
    selectedTaskIds,
    toggleSelection: toggleTaskSelection,
    onOpenTask: (id) => {
      const task = tasks.find((t) => t.id === id);
      if (task) setSelectedTask(task);
    },
    onCycleStatus: (id) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      const cycle = ["pending", "in_progress", "on_hold", "completed"];
      const next = (cycle.indexOf(task.status) + 1) % cycle.length;
      handleStatusChange(id, cycle[next]);
    },
    onCyclePriority: async (id) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      const cycle = ["low", "medium", "high"];
      const next = (cycle.indexOf(task.priority) + 1) % cycle.length;
      const newP = cycle[next];
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, priority: newP } : t)));
      await supabase.from("unified_tasks").update({ priority: newP }).eq("id", id);
      toast.success(`Priority → ${newP}`);
    },
    enabled: !selectedTask,
  });

  const { requestComplete, feedbackModalProps } = useTaskCompletion({
    onCompleted: () => { loadTasks(); onRefresh(); },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

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
        const [{ data: blockingCounts }, { data: blockedByCounts }, { data: subtaskRows }, { data: commentRows }] = await Promise.all([
          supabase.from("task_dependencies").select("depends_on_task_id").in("depends_on_task_id", taskIds),
          supabase.from("task_dependencies").select("task_id").in("task_id", taskIds),
          (supabase.from("unified_tasks") as any).select("parent_task_id, status").in("parent_task_id", taskIds),
          supabase.from("task_comments").select("task_id").in("task_id", taskIds),
        ]);

        const blockingMap = new Map<string, number>();
        blockingCounts?.forEach((r) => blockingMap.set(r.depends_on_task_id, (blockingMap.get(r.depends_on_task_id) || 0) + 1));
        const blockedByMap = new Map<string, number>();
        blockedByCounts?.forEach((r) => blockedByMap.set(r.task_id, (blockedByMap.get(r.task_id) || 0) + 1));
        const subtaskCountMap = new Map<string, number>();
        const subtaskCompletedMap = new Map<string, number>();
        subtaskRows?.forEach((r: any) => {
          subtaskCountMap.set(r.parent_task_id, (subtaskCountMap.get(r.parent_task_id) || 0) + 1);
          if (r.status === "completed") subtaskCompletedMap.set(r.parent_task_id, (subtaskCompletedMap.get(r.parent_task_id) || 0) + 1);
        });
        const commentCountMap = new Map<string, number>();
        commentRows?.forEach((r: any) => commentCountMap.set(r.task_id, (commentCountMap.get(r.task_id) || 0) + 1));

        setTasks(
          data.map((task) => ({
            ...task,
            blockingCount: blockingMap.get(task.id) || 0,
            blockedByCount: blockedByMap.get(task.id) || 0,
            subtaskCount: subtaskCountMap.get(task.id) || 0,
            subtaskCompleted: subtaskCompletedMap.get(task.id) || 0,
            commentCount: commentCountMap.get(task.id) || 0,
          })) as UnifiedTask[]
        );
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

  const getTasksByColumn = (columnKey: string) => {
    const colTasks = tasks.filter((t) => t.status === columnKey);
    // Sort by urgency descending
    return colTasks.sort((a, b) => computeUrgency(b) - computeUrgency(a));
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    if (newStatus === "completed") {
      const task = tasks.find((t) => t.id === taskId);
      requestComplete(taskId, task?.title || "Task");
      return;
    }
    const prev = tasks.find((t) => t.id === taskId);
    const prevStatus = prev?.status;
    setTasks((p) => p.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    try {
      const { error } = await supabase.from("unified_tasks").update({ status: newStatus, completed_at: null }).eq("id", taskId);
      if (error) throw error;
      toast.success("Status updated", {
        action: prevStatus ? { label: "Undo", onClick: async () => { await supabase.from("unified_tasks").update({ status: prevStatus, completed_at: null }).eq("id", taskId); loadTasks(); onRefresh(); } } : undefined,
        duration: 5000,
      });
      loadTasks();
      onRefresh();
    } catch {
      toast.error("Failed to update task");
      loadTasks();
    }
  };

  const handleDragStart = (e: DragStartEvent) => setActiveTask(tasks.find((t) => t.id === e.active.id) || null);
  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveTask(null);
    if (!over || active.id === over.id) return;
    await handleStatusChange(active.id as string, over.id as string);
  };

  const getColumnSummary = (colTasks: UnifiedTask[]) => {
    const blocked = colTasks.filter((t) => (t.blockedByCount ?? 0) > 0).length;
    const ready = colTasks.filter((t) => (t.blockedByCount ?? 0) === 0 && t.status !== "completed").length;
    return { blocked, ready };
  };

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 pb-4">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <BoardColumnSkeleton key={i} />)
          ) : (
            STATUS_COLUMNS.map((col) => {
              const colTasks = getTasksByColumn(col.key);
              const Icon = col.icon;
              const { blocked, ready } = getColumnSummary(colTasks);

              return (
                <SortableContext key={col.key} id={col.key} items={colTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  <div className={cn("rounded-lg border border-border/30 border-t-2 bg-muted/5", col.accent)}>
                    {/* Column header */}
                    <div className="flex items-center justify-between px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-semibold text-foreground">{col.label}</span>
                        <Badge variant="secondary" className="h-4 px-1 text-[10px] font-normal">
                          {colTasks.length}
                        </Badge>
                      </div>
                      {colTasks.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          {blocked > 0 && (
                            <span className="flex items-center gap-0.5 text-destructive/70">
                              <Lock className="h-2.5 w-2.5" />{blocked}
                            </span>
                          )}
                          {ready > 0 && col.key !== "completed" && col.key !== "cancelled" && (
                            <span className="flex items-center gap-0.5 text-emerald-500/70">
                              <Link2 className="h-2.5 w-2.5" />{ready}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Tasks */}
                    <div className="px-1.5 pb-1.5 space-y-1.5 min-h-[120px]">
                      {colTasks.length === 0 ? (
                        <div className="border border-dashed border-border/30 rounded-md p-4 text-center">
                          <p className="text-[10px] text-muted-foreground/50 mb-2">No tasks</p>
                          <CreateUnifiedTaskDialog objectiveId={objectiveId} defaultStatus={col.key} onTaskCreated={() => { loadTasks(); onRefresh(); }}>
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1">
                              <Plus className="h-3 w-3" /> Add
                            </Button>
                          </CreateUnifiedTaskDialog>
                        </div>
                      ) : (
                        colTasks.map((task) => (
                          <TaskCardCompact
                            key={task.id}
                            task={{ ...task, project_tag: task.marketplace_projects?.title || null }}
                            onClick={setSelectedTask}
                            isFocused={focusedTaskId === task.id}
                            taskIndex={allTaskIds.indexOf(task.id)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </SortableContext>
              );
            })
          )}
        </div>

        {selectedTask && (
          <UnifiedTaskDetailSheet
            task={selectedTask}
            open={!!selectedTask}
            onClose={() => setSelectedTask(null)}
            onTaskUpdated={() => { loadTasks(); onRefresh(); }}
            onStatusChange={handleStatusChange}
          />
        )}

        <DragOverlay>
          {activeTask && (
            <div className="opacity-90 shadow-xl p-2.5 rounded-lg border border-primary bg-card max-w-[260px]">
              <div className="flex items-center gap-1.5">
                <div className={cn("h-2 w-2 rounded-full", activeTask.priority === "high" ? "bg-destructive" : activeTask.priority === "medium" ? "bg-amber-500" : "bg-emerald-500")} />
                <span className="text-sm font-medium truncate">{activeTask.title}</span>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <TaskCompletionFeedbackModal {...feedbackModalProps} />
    </>
  );
};

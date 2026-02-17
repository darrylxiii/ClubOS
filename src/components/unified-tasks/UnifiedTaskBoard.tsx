import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Hand,
  Rocket,
  Pause,
  CheckCircle2,
  XCircle,
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
    profiles: { full_name: string; avatar_url: string | null };
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
  { key: "pending", label: "Pending", icon: Hand, accent: "border-t-rose-500/50" },
  { key: "in_progress", label: "In Progress", icon: Rocket, accent: "border-t-amber-500/50" },
  { key: "on_hold", label: "On Hold", icon: Pause, accent: "border-t-blue-500/50" },
  { key: "completed", label: "Done", icon: CheckCircle2, accent: "border-t-emerald-500/50" },
  { key: "cancelled", label: "Cancelled", icon: XCircle, accent: "border-t-muted-foreground/30" },
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
    onOpenTask: (id) => { const t = tasks.find((x) => x.id === id); if (t) setSelectedTask(t); },
    onCycleStatus: (id) => {
      const t = tasks.find((x) => x.id === id);
      if (!t) return;
      const cycle = ["pending", "in_progress", "on_hold", "completed"];
      handleStatusChange(id, cycle[(cycle.indexOf(t.status) + 1) % cycle.length]);
    },
    onCyclePriority: async (id) => {
      const t = tasks.find((x) => x.id === id);
      if (!t) return;
      const cycle = ["low", "medium", "high"];
      const next = cycle[(cycle.indexOf(t.priority) + 1) % cycle.length];
      setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, priority: next } : x)));
      await supabase.from("unified_tasks").update({ priority: next }).eq("id", id);
      toast.success(`Priority → ${next}`);
    },
    enabled: !selectedTask,
  });

  const { requestComplete, feedbackModalProps } = useTaskCompletion({
    onCompleted: () => { loadTasks(); onRefresh(); },
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

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
        const bm = new Map<string, number>(); blockingCounts?.forEach((r) => bm.set(r.depends_on_task_id, (bm.get(r.depends_on_task_id) || 0) + 1));
        const bbm = new Map<string, number>(); blockedByCounts?.forEach((r) => bbm.set(r.task_id, (bbm.get(r.task_id) || 0) + 1));
        const scm = new Map<string, number>(); const sdm = new Map<string, number>();
        subtaskRows?.forEach((r: any) => { scm.set(r.parent_task_id, (scm.get(r.parent_task_id) || 0) + 1); if (r.status === "completed") sdm.set(r.parent_task_id, (sdm.get(r.parent_task_id) || 0) + 1); });
        const ccm = new Map<string, number>(); commentRows?.forEach((r: any) => ccm.set(r.task_id, (ccm.get(r.task_id) || 0) + 1));

        setTasks(data.map((t) => ({ ...t, blockingCount: bm.get(t.id) || 0, blockedByCount: bbm.get(t.id) || 0, subtaskCount: scm.get(t.id) || 0, subtaskCompleted: sdm.get(t.id) || 0, commentCount: ccm.get(t.id) || 0 })) as UnifiedTask[]);
      } else { setTasks((data as UnifiedTask[]) || []); }
    } catch (error) { console.error("Error loading tasks:", error); toast.error("Failed to load tasks"); } finally { setLoading(false); }
  };

  const getTasksByColumn = (key: string) => tasks.filter((t) => t.status === key).sort((a, b) => computeUrgency(b) - computeUrgency(a));

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    if (newStatus === "completed") { const t = tasks.find((x) => x.id === taskId); requestComplete(taskId, t?.title || "Task"); return; }
    const prev = tasks.find((t) => t.id === taskId);
    setTasks((p) => p.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    try {
      const { error } = await supabase.from("unified_tasks").update({ status: newStatus, completed_at: null }).eq("id", taskId);
      if (error) throw error;
      toast.success("Status updated", { action: prev?.status ? { label: "Undo", onClick: async () => { await supabase.from("unified_tasks").update({ status: prev.status, completed_at: null }).eq("id", taskId); loadTasks(); onRefresh(); } } : undefined, duration: 5000 });
      loadTasks(); onRefresh();
    } catch { toast.error("Failed to update task"); loadTasks(); }
  };

  const handleDragStart = (e: DragStartEvent) => setActiveTask(tasks.find((t) => t.id === e.active.id) || null);
  const handleDragEnd = async (e: DragEndEvent) => { const { active, over } = e; setActiveTask(null); if (!over || active.id === over.id) return; await handleStatusChange(active.id as string, over.id as string); };

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2 pb-4">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <BoardColumnSkeleton key={i} />)
          ) : (
            STATUS_COLUMNS.map((col) => {
              const colTasks = getTasksByColumn(col.key);
              const Icon = col.icon;

              return (
                <SortableContext key={col.key} id={col.key} items={colTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  <div className={cn("rounded-lg border border-border/20 border-t-2 bg-transparent", col.accent)}>
                    {/* Header — 28px */}
                    <div className="flex items-center justify-between px-2.5 py-1.5">
                      <div className="flex items-center gap-1">
                        <Icon className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[11px] font-semibold text-foreground">{col.label}</span>
                        <Badge variant="secondary" className="h-4 min-w-[16px] px-1 text-[10px] font-normal">{colTasks.length}</Badge>
                      </div>
                    </div>

                    {/* Tasks */}
                    <div className="px-1 pb-1 space-y-1 min-h-[80px]">
                      {colTasks.length === 0 ? (
                        <div className="border border-dashed border-border/20 rounded-md p-3 text-center">
                          <p className="text-[10px] text-muted-foreground/40 mb-1.5">Drop here</p>
                          <CreateUnifiedTaskDialog objectiveId={objectiveId} defaultStatus={col.key} onTaskCreated={() => { loadTasks(); onRefresh(); }}>
                            <Button variant="ghost" size="sm" className="h-5 text-[10px] gap-0.5 px-1.5">
                              <Plus className="h-2.5 w-2.5" /> Add
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
            task={selectedTask} open={!!selectedTask} onClose={() => setSelectedTask(null)}
            onTaskUpdated={() => { loadTasks(); onRefresh(); }}
            onStatusChange={handleStatusChange}
          />
        )}

        <DragOverlay>
          {activeTask && (
            <div className="opacity-95 shadow-xl scale-[1.02] p-2 rounded-lg border border-primary/40 bg-card max-w-[240px]">
              <div className="flex items-center gap-1.5">
                <div className={cn("h-1.5 w-1.5 rounded-full", activeTask.priority === "high" ? "bg-destructive" : activeTask.priority === "medium" ? "bg-amber-500" : "bg-emerald-500")} />
                <span className="text-[13px] font-medium truncate">{activeTask.title}</span>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
      <TaskCompletionFeedbackModal {...feedbackModalProps} />
    </>
  );
};

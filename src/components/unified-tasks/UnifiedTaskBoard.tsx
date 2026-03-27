import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { useUnifiedTasks, UnifiedTask } from "@/contexts/UnifiedTasksContext";
import { computeUrgency } from "@/lib/taskUrgency";
import { cn } from "@/lib/utils";

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
  const { t } = useTranslation('common');
  const {
    filteredTasks: tasks,
    loading,
    toggleTaskSelection,
    selectedTaskIds,
    refreshTasks,
    updateTask,
  } = useUnifiedTasks();

  const [selectedTask, setSelectedTask] = useState<UnifiedTask | null>(null);
  const [activeTask, setActiveTask] = useState<UnifiedTask | null>(null);

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
      await updateTask(id, { priority: next });
      toast.success(`Priority → ${next}`);
    },
    enabled: !selectedTask,
  });

  const { requestComplete, feedbackModalProps } = useTaskCompletion({
    onCompleted: () => { refreshTasks(); onRefresh(); },
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const getTasksByColumn = (key: string) => tasks.filter((t) => t.status === key).sort((a, b) => computeUrgency(b) - computeUrgency(a));

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    if (newStatus === "completed") { const t = tasks.find((x) => x.id === taskId); requestComplete(taskId, t?.title || "Task"); return; }
    const prev = tasks.find((t) => t.id === taskId);
    try {
      await updateTask(taskId, { status: newStatus });
      toast.success(t('tasks.statusUpdated', 'Status updated'), {
        action: prev?.status ? {
          label: t('tasks.undo', 'Undo'),
          onClick: async () => { await updateTask(taskId, { status: prev.status }); onRefresh(); }
        } : undefined,
        duration: 5000
      });
      onRefresh();
    } catch { toast.error(t('tasks.failedToUpdateTask', 'Failed to update task')); }
  };

  const handleDragStart = (e: DragStartEvent) => setActiveTask(tasks.find((t) => t.id === e.active.id) || null);
  const handleDragEnd = async (e: DragEndEvent) => { const { active, over } = e; setActiveTask(null); if (!over || active.id === over.id) return; await handleStatusChange(active.id as string, over.id as string); };

  const handleTaskUpdated = () => { refreshTasks(); onRefresh(); };

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
                  <div className={cn(
                    "rounded-lg border border-border/20 border-t-2 bg-transparent transition-all",
                    col.accent,
                    "data-[drop-target=true]:ring-2 data-[drop-target=true]:ring-primary/20"
                  )}>
                    <div className="flex items-center justify-between px-2.5 py-1.5">
                      <div className="flex items-center gap-1">
                        <Icon className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[11px] font-semibold text-foreground">{col.label}</span>
                        <Badge variant="secondary" className="h-4 min-w-[16px] px-1 text-[10px] font-normal tabular-nums">{colTasks.length}</Badge>
                      </div>
                    </div>

                    <div className="px-1 pb-1 space-y-1 min-h-[80px]">
                      {colTasks.length === 0 ? (
                        <div className="border border-dashed border-border/15 rounded-md p-4 text-center my-1 mx-0.5">
                          <p className="text-[10px] text-muted-foreground/30 mb-1.5">{t('tasks.dropTasksHere', 'Drop tasks here')}</p>
                          <CreateUnifiedTaskDialog objectiveId={objectiveId} defaultStatus={col.key} onTaskCreated={handleTaskUpdated}>
                            <Button variant="ghost" size="sm" className="h-5 text-[10px] gap-0.5 px-1.5">
                              <Plus className="h-2.5 w-2.5" /> {t('tasks.add', 'Add')}
                            </Button>
                          </CreateUnifiedTaskDialog>
                        </div>
                      ) : (
                        colTasks.map((task) => (
                          <TaskCardCompact
                            key={task.id}
                            task={task}
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
            onTaskUpdated={handleTaskUpdated}
            onStatusChange={handleStatusChange}
          />
        )}

        <DragOverlay dropAnimation={null}>
          {activeTask && (
            <div className="shadow-2xl shadow-black/20 scale-[1.02] p-2 rounded-lg border border-primary/30 bg-card/95 backdrop-blur-sm max-w-[240px]">
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

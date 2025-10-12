import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Plus, 
  Hand, 
  Rocket, 
  Pause, 
  CheckCircle2, 
  Sparkles,
  Clock,
  Lock,
  Unlock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { CreateUnifiedTaskDialog } from "./CreateUnifiedTaskDialog";
import { UnifiedTaskDetailDialog } from "./UnifiedTaskDetailDialog";
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
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  migration_status: string;
}

interface UnifiedTaskBoardProps {
  objectiveId: string | null;
  objectiveName?: string;
  onRefresh: () => void;
  aiSchedulingEnabled: boolean;
}

const STATUS_COLUMNS = [
  { key: "pending", label: "Pending", icon: Hand, color: "bg-rose-500/20 border-rose-500/50" },
  { key: "in_progress", label: "In Progress", icon: Rocket, color: "bg-amber-500/20 border-amber-500/50" },
  { key: "on_hold", label: "On Hold", icon: Pause, color: "bg-blue-500/20 border-blue-500/50" },
  { key: "completed", label: "Completed", icon: CheckCircle2, color: "bg-green-500/20 border-green-500/50" },
];

const DraggableTaskCard = ({ task, onClick }: { task: UnifiedTask; onClick: () => void }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        className="p-4 hover:shadow-lg transition-all cursor-move border-l-4 border-l-transparent hover:border-l-primary animate-fade-in"
        onClick={onClick}
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium">{task.title}</h4>
                {task.auto_scheduled && (
                  <Sparkles className="h-3 w-3 text-accent" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {task.task_number}
              </p>
              {task.migration_status !== 'new' && (
                <Badge variant="outline" className="text-[10px] mt-1">
                  {task.migration_status === 'migrated_from_club' && 'From Club'}
                  {task.migration_status === 'migrated_from_pilot' && 'From Pilot'}
                </Badge>
              )}
            </div>
          </div>

          {/* Assignees */}
          {task.assignees && task.assignees.length > 0 && (
            <div className="flex -space-x-2">
              {task.assignees.slice(0, 3).map((assignee) => (
                <Avatar key={assignee.user_id} className="h-6 w-6 border-2 border-background">
                  <AvatarImage src={assignee.profiles?.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {assignee.profiles?.full_name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
              ))}
              {task.assignees.length > 3 && (
                <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px]">
                  +{task.assignees.length - 3}
                </div>
              )}
            </div>
          )}

          {/* Blocking/Blocked By Stats */}
          <TooltipProvider>
            <div className="flex items-center gap-3">
              {task.blockingCount > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-xs">
                      <Lock className="h-3 w-3 text-orange-500" />
                      <span className="font-medium">{task.blockingCount}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-popover">
                    <p className="text-xs">Blocking {task.blockingCount} task(s)</p>
                  </TooltipContent>
                </Tooltip>
              )}
              
              {task.blockedByCount > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-xs">
                      <Unlock className="h-3 w-3 text-blue-500" />
                      <span className="font-medium">{task.blockedByCount}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-popover">
                    <p className="text-xs">Blocked by {task.blockedByCount} task(s)</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>

          {/* Scheduling info */}
          {task.scheduled_start && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {format(new Date(task.scheduled_start), "MMM d, HH:mm")}
            </div>
          )}

          {/* Due date */}
          {task.due_date && (
            <p className="text-xs text-muted-foreground">
              📅 Due: {format(new Date(task.due_date), "MMM d, yyyy")}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
};

export const UnifiedTaskBoard = ({ 
  objectiveId, 
  objectiveName,
  onRefresh,
  aiSchedulingEnabled 
}: UnifiedTaskBoardProps) => {
  const [tasks, setTasks] = useState<UnifiedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<UnifiedTask | null>(null);
  const [activeTask, setActiveTask] = useState<UnifiedTask | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    loadTasks();
  }, [objectiveId]);

  const loadTasks = async () => {
    try {
      let query = supabase
        .from("unified_tasks")
        .select(`
          *,
          assignees:unified_task_assignees(
            user_id,
            profiles(full_name, avatar_url)
          )
        `)
        .order("created_at", { ascending: false });

      if (objectiveId) {
        query = query.eq("objective_id", objectiveId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch dependency counts for each task
      if (data) {
        const tasksWithDeps = await Promise.all(
          data.map(async (task) => {
            // Get blocking count (tasks this task blocks)
            const { data: blocking } = await supabase
              .from("task_dependencies")
              .select("id")
              .eq("depends_on_task_id", task.id);

            // Get blocked-by count (tasks that block this task)
            const { data: blockedBy } = await supabase
              .from("task_dependencies")
              .select("id")
              .eq("task_id", task.id);

            return {
              ...task,
              blockingCount: blocking?.length || 0,
              blockedByCount: blockedBy?.length || 0,
            };
          })
        );

        setTasks(tasksWithDeps as UnifiedTask[]);
      } else {
        setTasks([]);
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status);
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    // Optimistically update UI
    setTasks(prev =>
      prev.map(task =>
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    );

    try {
      const { error } = await supabase
        .from("unified_tasks")
        .update({ 
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null
        })
        .eq("id", taskId);

      if (error) throw error;
      toast.success("Task status updated");
      loadTasks();
      onRefresh();
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
      // Revert on error
      loadTasks();
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || active.id === over.id) return;

    const newStatus = over.id as string;
    const taskId = active.id as string;

    await handleStatusChange(taskId, newStatus);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATUS_COLUMNS.map((column) => {
            const columnTasks = getTasksByStatus(column.key);
            const Icon = column.icon;

            return (
              <SortableContext
                key={column.key}
                id={column.key}
                items={columnTasks.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <Card className={`border-2 ${column.color}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5" />
                        <CardTitle className="text-lg">{column.label}</CardTitle>
                      </div>
                      <Badge variant="secondary">{columnTasks.length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 min-h-[400px]">
                    {columnTasks.length === 0 ? (
                      <div className="border-2 border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground">
                        Drop tasks here
                      </div>
                    ) : (
                      columnTasks.map((task) => (
                        <DraggableTaskCard
                          key={task.id}
                          task={task}
                          onClick={() => setSelectedTask(task)}
                        />
                      ))
                    )}
                  </CardContent>
                </Card>
              </SortableContext>
            );
          })}
        </div>

        {/* Task Detail Dialog */}
        {selectedTask && (
          <UnifiedTaskDetailDialog
            task={selectedTask}
            open={!!selectedTask}
            onClose={() => setSelectedTask(null)}
            onTaskUpdated={() => {
              loadTasks();
              onRefresh();
            }}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>

      <DragOverlay>
        {activeTask && (
          <Card className="opacity-90 shadow-xl rotate-2 p-4 border-primary">
            <div className="flex items-center gap-2">
              <h4 className="font-medium">{activeTask.title}</h4>
              <Badge variant="secondary" className="text-xs">{activeTask.task_number}</Badge>
            </div>
          </Card>
        )}
      </DragOverlay>
    </DndContext>
  );
};

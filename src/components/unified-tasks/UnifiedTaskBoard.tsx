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
  Unlock,
  Briefcase,
  User
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { CreateUnifiedTaskDialog } from "./CreateUnifiedTaskDialog";
import { UnifiedTaskDetailDialog } from "./UnifiedTaskDetailDialog";
import { UnifiedTaskCard } from "./UnifiedTaskCard";
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
  project_id?: string;
  marketplace_projects?: {
    title: string;
  };
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
  const [groupBy, setGroupBy] = useState<'status' | 'assignee'>('status');

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

  const getColumns = () => {
    if (groupBy === 'status') return STATUS_COLUMNS;

    // Generate assignee columns dynamically
    const assignees = Array.from(new Set(tasks.flatMap(t => t.assignees?.map(a => a.profiles.full_name) || [])));
    return [
      { key: 'unassigned', label: 'Unassigned', icon: Briefcase, color: "bg-gray-500/20 border-gray-500/50" },
      ...assignees.map(name => ({
        key: name,
        label: name,
        icon: User,
        color: "bg-indigo-500/20 border-indigo-500/50"
      }))
    ];
  };

  const getTasksByColumn = (columnKey: string) => {
    if (groupBy === 'status') {
      return tasks.filter(task => task.status === columnKey);
    } else {
      if (columnKey === 'unassigned') {
        return tasks.filter(task => !task.assignees || task.assignees.length === 0);
      }
      return tasks.filter(task => task.assignees?.some(a => a.profiles.full_name === columnKey));
    }
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
        {/* Toolbar */}
        <div className="flex justify-between items-center bg-card/50 p-2 rounded-lg border backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground pl-2">Group By:</span>
            <div className="flex bg-muted/50 rounded-md p-1">
              <Button
                variant={groupBy === 'status' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setGroupBy('status')}
              >
                Status
              </Button>
              <Button
                variant={groupBy === 'assignee' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setGroupBy('assignee')}
              >
                Assignee
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto pb-4">
          {getColumns().map((column) => {
            const columnTasks = getTasksByColumn(column.key);
            const Icon = column.icon;

            return (
              <SortableContext
                key={column.key}
                id={column.key}
                items={columnTasks.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <Card className={`border-2 ${column.color} min-w-[300px]`}>
                  <CardHeader className="pb-3 sticky top-0 bg-background/95 backdrop-blur z-10 p-4 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5" />
                        <CardTitle className="text-lg whitespace-nowrap">{column.label}</CardTitle>
                      </div>
                      <Badge variant="secondary">{columnTasks.length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 min-h-[400px] p-2 bg-muted/10">
                    {columnTasks.length === 0 ? (
                      <div className="border-2 border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground h-full flex flex-col items-center justify-center opacity-50">
                        Drop tasks here
                      </div>
                    ) : (
                      columnTasks.map((task) => (
                        <UnifiedTaskCard
                          key={task.id}
                          task={{
                            ...task,
                            project_tag: task.marketplace_projects?.title || null
                          }}
                          onClick={setSelectedTask}
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

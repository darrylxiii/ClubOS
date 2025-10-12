import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, MoreVertical, Hand, Rocket, Pause, CheckCircle2, ParkingCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreateClubTaskDialog } from "./CreateClubTaskDialog";
import { ClubTaskDetailDialog } from "./ClubTaskDetailDialog";
import { format } from "date-fns";

interface ClubTask {
  id: string;
  task_number: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assignees?: Array<{
    user_id: string;
  }>;
  blockers?: Array<{
    blocking_task_id: string;
  }>;
}

interface ClubTaskBoardProps {
  objectiveId: string;
  objectiveName: string;
  onRefresh: () => void;
}

const STATUS_COLUMNS = [
  { key: "pending", label: "Pending", icon: Hand, color: "bg-rose-500/20 border-rose-500/50" },
  { key: "in_progress", label: "In Progress", icon: Rocket, color: "bg-amber-500/20 border-amber-500/50" },
  { key: "on_hold", label: "On Hold", icon: Pause, color: "bg-blue-500/20 border-blue-500/50" },
  { key: "completed", label: "Completed", icon: CheckCircle2, color: "bg-green-500/20 border-green-500/50" },
];

export const ClubTaskBoard = ({ objectiveId, objectiveName, onRefresh }: ClubTaskBoardProps) => {
  const [tasks, setTasks] = useState<ClubTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<ClubTask | null>(null);

  useEffect(() => {
    loadTasks();
  }, [objectiveId]);

  const loadTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("club_tasks")
        .select(`
          *,
          assignees:task_assignees(
            user_id
          ),
          blockers:task_blockers!task_blockers_blocked_task_id_fkey(
            blocking_task_id
          )
        `)
        .eq("objective_id", objectiveId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks(data || []);
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

  const handleTaskCreated = () => {
    loadTasks();
    onRefresh();
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("club_tasks")
        .update({ status: newStatus })
        .eq("id", taskId);

      if (error) throw error;
      toast.success("Task status updated");
      loadTasks();
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATUS_COLUMNS.map((column) => {
          const columnTasks = getTasksByStatus(column.key);
          const Icon = column.icon;

          return (
            <Card key={column.key} className={`border-2 ${column.color}`}>
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
                {columnTasks.map((task) => (
                  <Card
                    key={task.id}
                    className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => setSelectedTask(task)}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{task.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {task.task_number}
                          </p>
                        </div>
                        {task.status === "blocked" && (
                          <Badge variant="destructive" className="ml-2">
                            <Hand className="h-3 w-3 mr-1" />
                            Blocked
                          </Badge>
                        )}
                      </div>

                      {/* Assignees */}
                      {task.assignees && task.assignees.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          👥 {task.assignees.length} assignee(s)
                        </div>
                      )}

                      {/* Blockers */}
                      {task.blockers && task.blockers.length > 0 && (
                        <div className="text-xs text-destructive">
                          🚫 Blocked by {task.blockers.length} task(s)
                        </div>
                      )}

                      {/* Due date */}
                      {task.due_date && (
                        <p className="text-xs text-muted-foreground">
                          📅 {format(new Date(task.due_date), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                  </Card>
                ))}

                {/* Add task button */}
                <CreateClubTaskDialog
                  objectiveId={objectiveId}
                  defaultStatus={column.key}
                  onTaskCreated={handleTaskCreated}
                >
                  <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground">
                    <Plus className="h-4 w-4" />
                    Add task
                  </Button>
                </CreateClubTaskDialog>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Task Detail Dialog */}
      {selectedTask && (
        <ClubTaskDetailDialog
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
  );
};

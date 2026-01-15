import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Clock, 
  Calendar,
  Sparkles, 
  TrendingUp,
  Circle 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, isToday, parseISO } from "date-fns";
import { CreateUnifiedTaskDialog } from "./CreateUnifiedTaskDialog";

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
  company_name: string | null;
  position: string | null;
}

interface UnifiedTasksListProps {
  objectiveId: string | null;
  onRefresh: () => void;
  aiSchedulingEnabled: boolean;
}

export const UnifiedTasksList = ({ 
  objectiveId,
  onRefresh,
  aiSchedulingEnabled 
}: UnifiedTasksListProps) => {
  const [tasks, setTasks] = useState<UnifiedTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, [objectiveId]);

  const loadTasks = async () => {
    try {
      let query = supabase
        .from("unified_tasks")
        .select(`
          *,
          assignees:unified_task_assignees(user_id)
        `)
        .order("due_date", { ascending: true });

      if (objectiveId) {
        query = query.eq("objective_id", objectiveId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      const filteredTasks = data || [];
      
      setTasks(filteredTasks);
    } catch (error) {
      console.error("Error loading tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      const { error } = await supabase
        .from("unified_tasks")
        .update({ 
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null
        })
        .eq("id", taskId);

      if (error) throw error;
      toast.success(newStatus === 'completed' ? 'Task completed!' : 'Task reopened');
      loadTasks();
      onRefresh();
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "secondary";
    }
  };

  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case 'interview_prep': return '📝';
      case 'application': return '📄';
      case 'follow_up': return '📧';
      case 'research': return '🔍';
      case 'meeting': return '👥';
      default: return '✓';
    }
  };

  const todayTasks = tasks.filter(task => 
    task.scheduled_start && isToday(parseISO(task.scheduled_start))
  );

  const upcomingTasks = tasks.filter(task =>
    task.scheduled_start && 
    !isToday(parseISO(task.scheduled_start)) &&
    new Date(task.scheduled_start) > new Date()
  );

  const unscheduledTasks = tasks.filter(task => !task.scheduled_start);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Loading tasks...</p>
        </CardContent>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Circle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No tasks yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first task to get started
          </p>
          <CreateUnifiedTaskDialog
            objectiveId={objectiveId}
            onTaskCreated={() => {
              loadTasks();
              onRefresh();
            }}
          >
            <Button>
              Create Task
            </Button>
          </CreateUnifiedTaskDialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Today's Tasks */}
      {todayTasks.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Today
          </h2>
          <div className="space-y-2">
            {todayTasks.map((task) => (
              <Card
                key={task.id}
                className="border-2 border-border hover:border-primary transition-colors"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={task.status === 'completed'}
                      onCheckedChange={() => handleToggleTask(task.id, task.status)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{getTaskTypeIcon(task.task_type)}</span>
                        <h3 className={`font-semibold ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </h3>
                        {task.auto_scheduled && (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <Sparkles className="w-3 h-3" />
                            Auto
                          </Badge>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs">
                        <Badge variant={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                        {task.scheduled_start && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {format(parseISO(task.scheduled_start), 'HH:mm')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Tasks */}
      {upcomingTasks.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Upcoming
          </h2>
          <div className="space-y-2">
            {upcomingTasks.map((task) => (
              <Card
                key={task.id}
                className="border-2 border-border hover:border-primary transition-colors"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={task.status === 'completed'}
                      onCheckedChange={() => handleToggleTask(task.id, task.status)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{getTaskTypeIcon(task.task_type)}</span>
                        <h3 className="font-semibold">{task.title}</h3>
                        {task.auto_scheduled && (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <Sparkles className="w-3 h-3" />
                            Auto
                          </Badge>
                        )}
                      </div>
                      {task.scheduled_start && (
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(task.scheduled_start), 'MMM d, HH:mm')}
                        </p>
                      )}
                      <Badge variant={getPriorityColor(task.priority)} className="text-xs mt-2">
                        {task.priority}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Unscheduled Tasks */}
      {unscheduledTasks.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            Unscheduled
          </h2>
          <div className="space-y-2">
            {unscheduledTasks.map((task) => (
              <Card
                key={task.id}
                className="border-2 border-dashed border-border hover:border-primary transition-colors"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={task.status === 'completed'}
                      onCheckedChange={() => handleToggleTask(task.id, task.status)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{getTaskTypeIcon(task.task_type)}</span>
                        <h3 className="font-semibold">{task.title}</h3>
                      </div>
                      {task.due_date && (
                        <p className="text-xs text-muted-foreground">
                          Due: {format(parseISO(task.due_date), 'MMM d')}
                        </p>
                      )}
                      <Badge variant={getPriorityColor(task.priority)} className="text-xs mt-2">
                        {task.priority}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

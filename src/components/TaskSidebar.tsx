import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Calendar, CheckCircle2, Circle, Clock, Plus, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { CreateTaskDialog } from "./CreateTaskDialog";
import { TaskTemplates } from "./TaskTemplates";

interface Task {
  id: string;
  title: string;
  description: string | null;
  task_type: string;
  priority: string;
  status: string;
  due_date: string | null;
  estimated_duration_minutes: number;
  scheduled_start: string | null;
  scheduled_end: string | null;
  company_name: string | null;
  position: string | null;
  auto_scheduled: boolean;
}

export function TaskSidebar() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [schedulingLoading, setSchedulingLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadTasks();
      
      // Set up realtime subscription
      const channel = supabase
        .channel('tasks-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            loadTasks();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadTasks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['pending', 'in_progress'])
        .order('priority', { ascending: false })
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', taskId);

      if (error) throw error;
      toast.success(newStatus === 'completed' ? 'Task completed!' : 'Task reopened');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const handleScheduleTasks = async () => {
    setSchedulingLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('schedule-tasks', {
        body: {},
      });

      if (error) {
        if (error.message.includes('429')) {
          toast.error('Rate limit exceeded. Please try again in a moment.');
        } else if (error.message.includes('402')) {
          toast.error('Please add credits to your workspace to use AI scheduling.');
        } else {
          throw error;
        }
        return;
      }

      if (data?.success) {
        toast.success(`Scheduled ${data.scheduled_count} tasks successfully!`);
        loadTasks();
      }
    } catch (error) {
      console.error('Error scheduling tasks:', error);
      toast.error('Failed to schedule tasks');
    } finally {
      setSchedulingLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
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
    task.scheduled_start && 
    new Date(task.scheduled_start).toDateString() === new Date().toDateString()
  );

  const upcomingTasks = tasks.filter(task =>
    task.scheduled_start && 
    new Date(task.scheduled_start) > new Date() &&
    new Date(task.scheduled_start).toDateString() !== new Date().toDateString()
  );

  const unscheduledTasks = tasks.filter(task => !task.scheduled_start);

  return (
    <Card className="h-full flex flex-col border-0 bg-card/30 backdrop-blur-md">
      <CardHeader className="pb-3">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Tasks</CardTitle>
              <CardDescription>Manage your pipeline activities</CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <CreateTaskDialog 
              trigger={
                <Button size="sm" variant="outline" className="flex-1">
                  <Plus className="w-4 h-4 mr-2" />
                  New Task
                </Button>
              }
              onTaskCreated={loadTasks}
            />
            <TaskTemplates />
            <Button
              size="sm"
              onClick={handleScheduleTasks}
              disabled={schedulingLoading || unscheduledTasks.length === 0}
              className="bg-gradient-accent text-background flex-1"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {schedulingLoading ? 'Scheduling...' : 'AI Schedule'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <ScrollArea className="flex-1 px-6">
        <CardContent className="space-y-6 p-0">
          {/* Today's Tasks */}
          {todayTasks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-accent" />
                <h3 className="font-semibold text-sm">Today</h3>
                <Badge variant="secondary" className="text-xs">
                  {todayTasks.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {todayTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-background/50 hover:bg-background/80 transition-colors"
                  >
                    <Checkbox
                      checked={task.status === 'completed'}
                      onCheckedChange={() => handleToggleTask(task.id, task.status)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{getTaskTypeIcon(task.task_type)}</span>
                        <span className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </span>
                      </div>
                      {task.company_name && (
                        <p className="text-xs text-muted-foreground">
                          {task.company_name} {task.position && `• ${task.position}`}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                          {task.priority}
                        </Badge>
                        {task.scheduled_start && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {format(new Date(task.scheduled_start), 'HH:mm')}
                          </div>
                        )}
                        {task.auto_scheduled && (
                          <Sparkles className="w-3 h-3 text-accent" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Tasks */}
          {upcomingTasks.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Circle className="w-4 h-4 text-accent" />
                  <h3 className="font-semibold text-sm">Upcoming</h3>
                  <Badge variant="secondary" className="text-xs">
                    {upcomingTasks.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {upcomingTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-background/50 hover:bg-background/80 transition-colors"
                    >
                      <Checkbox
                        checked={task.status === 'completed'}
                        onCheckedChange={() => handleToggleTask(task.id, task.status)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{getTaskTypeIcon(task.task_type)}</span>
                          <span className="text-sm font-medium">{task.title}</span>
                        </div>
                        {task.scheduled_start && (
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(task.scheduled_start), 'MMM d, HH:mm')}
                          </p>
                        )}
                        <Badge variant={getPriorityColor(task.priority)} className="text-xs mt-2">
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Unscheduled Tasks */}
          {unscheduledTasks.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-semibold text-sm">Unscheduled</h3>
                  <Badge variant="outline" className="text-xs">
                    {unscheduledTasks.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {unscheduledTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-3 rounded-lg border border-dashed bg-background/30 hover:bg-background/50 transition-colors"
                    >
                      <Checkbox
                        checked={task.status === 'completed'}
                        onCheckedChange={() => handleToggleTask(task.id, task.status)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{getTaskTypeIcon(task.task_type)}</span>
                          <span className="text-sm font-medium">{task.title}</span>
                        </div>
                        {task.due_date && (
                          <p className="text-xs text-muted-foreground">
                            Due: {format(new Date(task.due_date), 'MMM d')}
                          </p>
                        )}
                        <Badge variant={getPriorityColor(task.priority)} className="text-xs mt-2">
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {tasks.length === 0 && !loading && (
            <div className="text-center py-12">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No tasks yet. They'll appear here automatically based on your pipeline activities.
              </p>
            </div>
          )}
        </CardContent>
      </ScrollArea>
    </Card>
  );
}
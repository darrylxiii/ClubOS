import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  Filter,
  Plus,
  MoreVertical,
  Sparkles,
  TrendingUp,
  Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { CreateTaskDialog } from "@/components/CreateTaskDialog";
import { TaskSchedulingPreferences } from "@/components/TaskSchedulingPreferences";
import { format, startOfWeek, addDays, isToday, isTomorrow, parseISO } from "date-fns";

interface Task {
  id: string;
  title: string;
  description: string | null;
  task_type: string;
  priority: string;
  status: string;
  due_date: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  estimated_duration_minutes: number;
  company_name: string | null;
  position: string | null;
  auto_scheduled: boolean;
  completed_at: string | null;
}

const TasksPilot = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [autoScheduleEnabled, setAutoScheduleEnabled] = useState(false);
  const [weekDays, setWeekDays] = useState<Date[]>([]);

  useEffect(() => {
    // Generate week days starting from today
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
    setWeekDays(days);
    
    loadTasks();
    loadSchedulingPreferences();
  }, [user]);

  const loadTasks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("due_date", { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error("Error loading tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const loadSchedulingPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("task_scheduling_preferences")
        .select("auto_schedule_enabled")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setAutoScheduleEnabled(data.auto_schedule_enabled || false);
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    }
  };

  const handleAutoSchedule = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("schedule-tasks", {
        body: { userId: user?.id },
      });

      if (error) throw error;

      toast.success("Tasks auto-scheduled successfully!");
      loadTasks();
    } catch (error) {
      console.error("Error auto-scheduling:", error);
      toast.error("Failed to auto-schedule tasks");
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", taskId);

      if (error) throw error;

      toast.success("Task completed!");
      loadTasks();
    } catch (error) {
      console.error("Error completing task:", error);
      toast.error("Failed to complete task");
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-500 bg-red-500/10";
      case "medium":
        return "text-yellow-500 bg-yellow-500/10";
      case "low":
        return "text-green-500 bg-green-500/10";
      default:
        return "text-gray-500 bg-gray-500/10";
    }
  };

  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case "interview_prep":
        return <Clock className="w-4 h-4" />;
      case "application":
        return <CheckCircle2 className="w-4 h-4" />;
      case "follow_up":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Circle className="w-4 h-4" />;
    }
  };

  const getTasksForDay = (day: Date) => {
    return tasks.filter((task) => {
      if (!task.scheduled_start) return false;
      const taskDate = parseISO(task.scheduled_start);
      return (
        taskDate.getDate() === day.getDate() &&
        taskDate.getMonth() === day.getMonth() &&
        taskDate.getFullYear() === day.getFullYear()
      );
    });
  };

  const todayTasks = tasks.filter((task) => {
    if (!task.due_date) return false;
    return isToday(parseISO(task.due_date));
  });

  const upcomingTasks = tasks.filter((task) => {
    if (!task.due_date) return false;
    const dueDate = parseISO(task.due_date);
    return !isToday(dueDate) && !isTomorrow(dueDate);
  });

  const completedTasks = tasks.filter((task) => task.status === "completed");
  const pendingTasks = tasks.filter((task) => task.status === "pending");

  const stats = [
    {
      title: "Pending",
      value: pendingTasks.length,
      icon: Circle,
      color: "text-blue-500",
    },
    {
      title: "Today",
      value: todayTasks.length,
      icon: Calendar,
      color: "text-purple-500",
    },
    {
      title: "Completed",
      value: completedTasks.length,
      icon: CheckCircle2,
      color: "text-green-500",
    },
    {
      title: "Auto-Scheduled",
      value: tasks.filter((t) => t.auto_scheduled).length,
      icon: Zap,
      color: "text-yellow-500",
    },
  ];

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tight mb-2">
              Club Task Pilot
            </h1>
            <p className="text-muted-foreground">
              AI-powered task scheduling and management
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleAutoSchedule}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Auto-Schedule
            </Button>
            <CreateTaskDialog
              trigger={
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  New Task
                </Button>
              }
              onTaskCreated={loadTasks}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="border-2 border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </span>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div className="text-3xl font-black">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Auto-Schedule Banner */}
        {!autoScheduleEnabled && (
          <Card className="border-2 border-primary bg-primary/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">
                    Enable Auto-Scheduling
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Let AI automatically schedule your tasks based on your
                    preferences and availability
                  </p>
                </div>
                <TaskSchedulingPreferences />
              </div>
            </CardContent>
          </Card>
        )}

        {/* View Toggle */}
        <Tabs value={view} onValueChange={(v) => setView(v as any)}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          </TabsList>

          {/* List View */}
          <TabsContent value="list" className="space-y-4 mt-6">
            {loading ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">Loading tasks...</p>
                </CardContent>
              </Card>
            ) : tasks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Circle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No tasks yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first task to get started
                  </p>
                  <CreateTaskDialog
                    trigger={
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Task
                      </Button>
                    }
                    onTaskCreated={loadTasks}
                  />
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Today's Tasks */}
                {todayTasks.length > 0 && (
                  <div>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Today
                    </h2>
                    <div className="space-y-2">
                      {todayTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onComplete={handleCompleteTask}
                          getPriorityColor={getPriorityColor}
                          getTaskTypeIcon={getTaskTypeIcon}
                        />
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
                        <TaskCard
                          key={task.id}
                          task={task}
                          onComplete={handleCompleteTask}
                          getPriorityColor={getPriorityColor}
                          getTaskTypeIcon={getTaskTypeIcon}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Calendar View */}
          <TabsContent value="calendar" className="mt-6">
            <div className="grid grid-cols-7 gap-4">
              {weekDays.map((day) => {
                const dayTasks = getTasksForDay(day);
                return (
                  <Card
                    key={day.toISOString()}
                    className={`border-2 ${
                      isToday(day) ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground uppercase">
                            {format(day, "EEE")}
                          </div>
                          <div className="text-2xl font-black">
                            {format(day, "d")}
                          </div>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {dayTasks.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          No tasks
                        </p>
                      ) : (
                        dayTasks.map((task) => (
                          <div
                            key={task.id}
                            className="p-2 rounded-lg bg-card border border-border text-xs"
                          >
                            <div className="flex items-start gap-2 mb-1">
                              {getTaskTypeIcon(task.task_type)}
                              <span className="font-medium line-clamp-2">
                                {task.title}
                              </span>
                            </div>
                            {task.scheduled_start && (
                              <div className="text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(parseISO(task.scheduled_start), "HH:mm")}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

interface TaskCardProps {
  task: Task;
  onComplete: (taskId: string) => void;
  getPriorityColor: (priority: string) => string;
  getTaskTypeIcon: (type: string) => JSX.Element;
}

const TaskCard = ({
  task,
  onComplete,
  getPriorityColor,
  getTaskTypeIcon,
}: TaskCardProps) => {
  return (
    <Card className="border-2 border-border hover:border-primary transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0"
            onClick={() => onComplete(task.id)}
            disabled={task.status === "completed"}
          >
            {task.status === "completed" ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <Circle className="w-5 h-5" />
            )}
          </Button>

          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-2">
              <h3
                className={`font-semibold ${
                  task.status === "completed"
                    ? "line-through text-muted-foreground"
                    : ""
                }`}
              >
                {task.title}
              </h3>
              {task.auto_scheduled && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Zap className="w-3 h-3" />
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
              <Badge variant="outline" className={getPriorityColor(task.priority)}>
                {task.priority}
              </Badge>

              <div className="flex items-center gap-1 text-muted-foreground">
                {getTaskTypeIcon(task.task_type)}
                <span className="capitalize">{task.task_type.replace("_", " ")}</span>
              </div>

              {task.estimated_duration_minutes && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {task.estimated_duration_minutes}m
                </div>
              )}

              {task.due_date && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {format(parseISO(task.due_date), "MMM d")}
                </div>
              )}
            </div>

            {task.company_name && (
              <div className="mt-2 text-xs text-muted-foreground">
                {task.company_name}
                {task.position && ` • ${task.position}`}
              </div>
            )}
          </div>

          <Button variant="ghost" size="icon" className="flex-shrink-0">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TasksPilot;

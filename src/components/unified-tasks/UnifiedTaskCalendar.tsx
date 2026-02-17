import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  format,
  addDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  parseISO,
  isToday,
  isSameDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
} from "date-fns";
import { Clock, ChevronLeft, ChevronRight, CalendarDays, CalendarRange } from "lucide-react";
import { TaskCardSkeleton } from "./TaskCardSkeleton";
import { UnifiedTaskDetailSheet } from "./UnifiedTaskDetailSheet";
import { cn } from "@/lib/utils";

interface UnifiedTaskCalendarProps {
  objectiveId: string | null;
  onRefresh: () => void;
}

type CalendarMode = "week" | "month";

export const UnifiedTaskCalendar = ({
  objectiveId,
  onRefresh,
}: UnifiedTaskCalendarProps) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<CalendarMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

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
        .order("scheduled_start", { ascending: true });

      if (objectiveId) {
        query = query.eq("objective_id", objectiveId);
      }

      const { data, error } = await query;
      if (error) throw error;

      setTasks(data || []);
    } catch (error) {
      console.error("Error loading tasks:", error);
      toast.error("Failed to load calendar tasks");
    } finally {
      setLoading(false);
    }
  };

  const days = useMemo(() => {
    if (mode === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end: addDays(start, 6) });
    }
    // Month mode
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [mode, currentDate]);

  const getTasksForDay = (day: Date) => {
    return tasks.filter((task) => {
      const dateStr = task.scheduled_start || task.due_date;
      if (!dateStr) return false;
      return isSameDay(parseISO(dateStr), day);
    });
  };

  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case "interview_prep": return "📝";
      case "application": return "📄";
      case "follow_up": return "📧";
      case "research": return "🔍";
      case "meeting": return "👥";
      default: return "✓";
    }
  };

  const getPriorityDot = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-500";
      case "medium": return "bg-yellow-500";
      default: return "bg-blue-500";
    }
  };

  const navigateBack = () => {
    setCurrentDate((d) => (mode === "week" ? subWeeks(d, 1) : subMonths(d, 1)));
  };

  const navigateForward = () => {
    setCurrentDate((d) => (mode === "week" ? addWeeks(d, 1) : addMonths(d, 1)));
  };

  const goToToday = () => setCurrentDate(new Date());

  const handleReschedule = async (taskId: string, newDate: Date) => {
    try {
      const { error } = await supabase
        .from("unified_tasks")
        .update({
          scheduled_start: newDate.toISOString(),
          due_date: newDate.toISOString(),
        })
        .eq("id", taskId);

      if (error) throw error;

      // Optimistic update
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, scheduled_start: newDate.toISOString(), due_date: newDate.toISOString() }
            : t
        )
      );

      toast.success("Task rescheduled", {
        action: {
          label: "Undo",
          onClick: () => loadTasks(),
        },
        duration: 5000,
      });
      onRefresh();
    } catch (error) {
      console.error("Error rescheduling:", error);
      toast.error("Failed to reschedule task");
    }
  };

  // Drag-and-drop handlers
  const handleDragStart = (e: React.DragEvent, task: any) => {
    e.dataTransfer.setData("taskId", task.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, day: Date) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId) {
      handleReschedule(taskId, day);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="animate-pulse rounded bg-muted/60 h-8 w-48" />
          <div className="flex gap-2">
            <div className="animate-pulse rounded bg-muted/60 h-9 w-9" />
            <div className="animate-pulse rounded bg-muted/60 h-9 w-9" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Card key={i} className="border border-border">
              <CardHeader className="p-3 pb-2">
                <div className="animate-pulse rounded bg-muted/60 h-4 w-8 mx-auto" />
              </CardHeader>
              <CardContent className="p-2 space-y-2">
                <TaskCardSkeleton variant="calendar" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const isWeek = mode === "week";

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={navigateBack}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={navigateForward}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold">
            {isWeek
              ? `${format(days[0], "MMM d")} – ${format(days[days.length - 1], "MMM d, yyyy")}`
              : format(currentDate, "MMMM yyyy")}
          </h3>
        </div>

        <div className="flex items-center bg-muted/50 rounded-lg p-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-7 px-2.5 gap-1.5 text-xs", mode === "week" && "bg-background shadow-sm")}
            onClick={() => setMode("week")}
          >
            <CalendarRange className="h-3.5 w-3.5" />
            Week
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-7 px-2.5 gap-1.5 text-xs", mode === "month" && "bg-background shadow-sm")}
            onClick={() => setMode("month")}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Month
          </Button>
        </div>
      </div>

      {/* Day headers for month */}
      {mode === "month" && (
        <div className="grid grid-cols-7 gap-1">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
              {d}
            </div>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className={cn(
        "grid gap-1",
        isWeek ? "grid-cols-7 gap-3" : "grid-cols-7"
      )}>
        {days.map((day) => {
          const dayTasks = getTasksForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const today = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "rounded-lg border transition-colors",
                today ? "border-primary bg-primary/5" : "border-border/50",
                !isCurrentMonth && mode === "month" && "opacity-40",
                isWeek ? "min-h-[300px]" : "min-h-[100px]"
              )}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, day)}
            >
              {/* Day header */}
              <div className={cn("p-2 text-center border-b border-border/30", isWeek && "pb-3")}>
                {isWeek && (
                  <div className="text-xs text-muted-foreground uppercase">
                    {format(day, "EEE")}
                  </div>
                )}
                <div
                  className={cn(
                    "font-semibold inline-flex items-center justify-center",
                    isWeek ? "text-2xl" : "text-sm h-7 w-7 rounded-full",
                    today && !isWeek && "bg-primary text-primary-foreground"
                  )}
                >
                  {format(day, "d")}
                </div>
              </div>

              {/* Tasks */}
              <div className={cn("p-1 space-y-1", isWeek && "p-2 space-y-2")}>
                {dayTasks.length === 0 && isWeek && (
                  <p className="text-xs text-muted-foreground text-center py-4 opacity-50">
                    No tasks
                  </p>
                )}
                {dayTasks.slice(0, isWeek ? 20 : 3).map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    onClick={() => setSelectedTask(task)}
                    className={cn(
                      "rounded text-xs cursor-pointer transition-all hover:shadow-md active:scale-[0.98]",
                      isWeek
                        ? "p-2 bg-card border border-border hover:border-primary/30"
                        : "px-1.5 py-1 bg-card/80 border border-border/50 truncate"
                    )}
                  >
                    {isWeek ? (
                      <>
                        <div className="flex items-start gap-2 mb-1">
                          <span className="shrink-0">{getTaskTypeIcon(task.task_type)}</span>
                          <span className="font-medium line-clamp-2 flex-1">
                            {task.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", getPriorityDot(task.priority))} />
                          {task.scheduled_start && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(parseISO(task.scheduled_start), "HH:mm")}
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", getPriorityDot(task.priority))} />
                        <span className="truncate">{task.title}</span>
                      </div>
                    )}
                  </div>
                ))}
                {!isWeek && dayTasks.length > 3 && (
                  <div className="text-[10px] text-muted-foreground text-center">
                    +{dayTasks.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task detail sheet */}
      {selectedTask && (
        <UnifiedTaskDetailSheet
          task={selectedTask}
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={() => {
            loadTasks();
            onRefresh();
          }}
          onStatusChange={async (taskId: string, newStatus: string) => {
            await supabase
              .from("unified_tasks")
              .update({ status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : null })
              .eq("id", taskId);
            loadTasks();
            onRefresh();
          }}
        />
      )}
    </div>
  );
};

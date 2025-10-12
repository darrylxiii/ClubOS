import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addDays, parseISO, isToday } from "date-fns";
import { Clock } from "lucide-react";

interface UnifiedTaskCalendarProps {
  objectiveId: string | null;
  onRefresh: () => void;
}

export const UnifiedTaskCalendar = ({ 
  objectiveId, 
  onRefresh 
}: UnifiedTaskCalendarProps) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
    setWeekDays(days);
    
    loadTasks();
  }, [objectiveId]);

  const loadTasks = async () => {
    try {
      let query = supabase
        .from("unified_tasks")
        .select("*")
        .not("scheduled_start", "is", null)
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

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Loading calendar...</p>
        </CardContent>
      </Card>
    );
  }

  return (
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
                    className="p-2 rounded-lg bg-card border border-border text-xs hover:shadow-lg transition-shadow cursor-pointer"
                  >
                    <div className="flex items-start gap-2 mb-1">
                      <span>{getTaskTypeIcon(task.task_type)}</span>
                      <span className="font-medium line-clamp-2 flex-1">
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
  );
};

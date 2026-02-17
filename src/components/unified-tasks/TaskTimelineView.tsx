import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, differenceInDays, startOfDay, max, min, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Loader2, GanttChart } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TimelineTask {
  id: string;
  title: string;
  task_number: string;
  status: string;
  priority: string;
  due_date: string | null;
  scheduled_start: string | null;
  created_at: string;
  estimated_duration_minutes: number | null;
}

interface Dependency {
  task_id: string;
  depends_on_task_id: string;
}

interface TaskTimelineViewProps {
  objectiveId?: string | null;
  onRefresh: () => void;
}

const DAY_WIDTH = 40;
const ROW_HEIGHT = 36;
const HEADER_HEIGHT = 52;

const statusColors: Record<string, string> = {
  pending: "bg-rose-500/70",
  in_progress: "bg-amber-500/70",
  on_hold: "bg-blue-500/70",
  completed: "bg-green-500/70",
  cancelled: "bg-muted-foreground/30",
};

export function TaskTimelineView({ objectiveId, onRefresh }: TaskTimelineViewProps) {
  const [tasks, setTasks] = useState<TimelineTask[]>([]);
  const [deps, setDeps] = useState<Dependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewStart, setViewStart] = useState(() => startOfDay(addDays(new Date(), -7)));

  const VISIBLE_DAYS = 42; // 6 weeks

  useEffect(() => {
    loadData();
  }, [objectiveId]);

  const loadData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("unified_tasks")
        .select("id, title, task_number, status, priority, due_date, scheduled_start, created_at, estimated_duration_minutes")
        .order("scheduled_start", { ascending: true, nullsFirst: false });

      if (objectiveId) {
        query = query.eq("objective_id", objectiveId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter to tasks that have at least a date
      const withDates = (data || []).filter(
        (t) => t.due_date || t.scheduled_start
      );
      setTasks(withDates);

      // Load deps
      if (withDates.length > 0) {
        const ids = withDates.map((t) => t.id);
        const { data: depData } = await supabase
          .from("task_dependencies")
          .select("task_id, depends_on_task_id")
          .in("task_id", ids);
        setDeps(depData || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const days = useMemo(() => {
    return Array.from({ length: VISIBLE_DAYS }, (_, i) => addDays(viewStart, i));
  }, [viewStart]);

  const getTaskBar = (task: TimelineTask) => {
    const start = task.scheduled_start
      ? startOfDay(parseISO(task.scheduled_start))
      : task.due_date
        ? startOfDay(addDays(parseISO(task.due_date), -1))
        : startOfDay(parseISO(task.created_at));

    const durationDays = task.estimated_duration_minutes
      ? Math.max(1, Math.ceil(task.estimated_duration_minutes / 480))
      : task.due_date && task.scheduled_start
        ? Math.max(1, differenceInDays(parseISO(task.due_date), parseISO(task.scheduled_start)))
        : 1;

    const offsetDays = differenceInDays(start, viewStart);
    const left = offsetDays * DAY_WIDTH;
    const width = Math.max(DAY_WIDTH, durationDays * DAY_WIDTH);

    return { left, width, start, durationDays };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <GanttChart className="h-10 w-10 mb-3 opacity-20" />
          <p className="text-sm">No tasks with dates to display on the timeline.</p>
          <p className="text-xs mt-1">Add due dates or scheduled starts to see tasks here.</p>
        </CardContent>
      </Card>
    );
  }

  const todayOffset = differenceInDays(startOfDay(new Date()), viewStart);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <GanttChart className="h-5 w-5" />
            Timeline
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewStart((d) => addDays(d, -14))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setViewStart(startOfDay(addDays(new Date(), -7)))}>
              Today
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewStart((d) => addDays(d, 14))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="w-full">
          <div className="relative" style={{ minWidth: VISIBLE_DAYS * DAY_WIDTH + 220 }}>
            {/* Header */}
            <div className="flex sticky top-0 z-10 bg-card border-b">
              {/* Task name column */}
              <div className="w-[220px] shrink-0 p-2 border-r text-xs font-semibold text-muted-foreground flex items-center">
                Task
              </div>
              {/* Day columns */}
              <div className="flex">
                {days.map((day, i) => {
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  const isToday = i === todayOffset;
                  return (
                    <div
                      key={i}
                      className={`flex flex-col items-center justify-center border-r text-[10px] ${
                        isToday ? "bg-primary/10 font-bold text-primary" : isWeekend ? "bg-muted/30 text-muted-foreground/60" : "text-muted-foreground"
                      }`}
                      style={{ width: DAY_WIDTH, height: HEADER_HEIGHT }}
                    >
                      <span>{format(day, "EEE")}</span>
                      <span className="font-mono">{format(day, "d")}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rows */}
            {tasks.map((task, rowIdx) => {
              const bar = getTaskBar(task);
              return (
                <div key={task.id} className="flex border-b hover:bg-muted/20 transition-colors" style={{ height: ROW_HEIGHT }}>
                  {/* Name */}
                  <div className="w-[220px] shrink-0 flex items-center gap-2 px-2 border-r overflow-hidden">
                    <Badge variant="outline" className="text-[9px] font-mono shrink-0 h-4 px-1">{task.task_number}</Badge>
                    <span className="text-xs truncate">{task.title}</span>
                  </div>
                  {/* Bar area */}
                  <div className="relative flex-1">
                    {/* Today line */}
                    {todayOffset >= 0 && todayOffset < VISIBLE_DAYS && (
                      <div
                        className="absolute top-0 bottom-0 w-px bg-primary/50 z-[1]"
                        style={{ left: todayOffset * DAY_WIDTH + DAY_WIDTH / 2 }}
                      />
                    )}
                    {/* Task bar */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={`absolute top-1 rounded-md ${statusColors[task.status] || "bg-muted"} cursor-pointer transition-colors hover:opacity-80`}
                            style={{
                              left: Math.max(0, bar.left),
                              width: bar.width,
                              height: ROW_HEIGHT - 8,
                            }}
                          >
                            <span className="text-[10px] text-white font-medium px-1.5 truncate block leading-7">
                              {task.title}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs space-y-0.5">
                            <p className="font-semibold">{task.title}</p>
                            <p className="text-muted-foreground capitalize">{task.status} · {task.priority}</p>
                            {task.due_date && <p>Due: {format(parseISO(task.due_date), "MMM d, yyyy")}</p>}
                            {task.estimated_duration_minutes && <p>Est: {Math.round(task.estimated_duration_minutes / 60)}h</p>}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

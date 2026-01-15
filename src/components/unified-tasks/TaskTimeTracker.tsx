import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Square, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TaskTimeTrackerProps {
  taskId: string;
  initialMinutes?: number;
  timerRunning?: boolean;
  timerStartedAt?: string | null;
  onUpdate?: () => void;
  compact?: boolean;
}

export function TaskTimeTracker({
  taskId,
  initialMinutes = 0,
  timerRunning = false,
  timerStartedAt,
  onUpdate,
  compact = false,
}: TaskTimeTrackerProps) {
  const [isRunning, setIsRunning] = useState(timerRunning);
  const [startedAt, setStartedAt] = useState<Date | null>(
    timerStartedAt ? new Date(timerStartedAt) : null
  );
  const [totalMinutes, setTotalMinutes] = useState(initialMinutes);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loading, setLoading] = useState(false);

  // Calculate elapsed time when timer is running
  useEffect(() => {
    if (!isRunning || !startedAt) {
      setElapsedSeconds(0);
      return;
    }

    const updateElapsed = () => {
      const now = new Date();
      const seconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
      setElapsedSeconds(seconds);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [isRunning, startedAt]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const formatTotalTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const startTimer = async () => {
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("unified_tasks")
        .update({
          timer_running: true,
          timer_started_at: now,
        })
        .eq("id", taskId);

      if (error) throw error;

      setIsRunning(true);
      setStartedAt(new Date(now));
      toast.success("Timer started");
    } catch (error) {
      console.error("Error starting timer:", error);
      toast.error("Failed to start timer");
    } finally {
      setLoading(false);
    }
  };

  const stopTimer = async () => {
    if (!startedAt) return;

    setLoading(true);
    try {
      const now = new Date();
      const elapsedMinutes = Math.floor((now.getTime() - startedAt.getTime()) / 60000);
      const newTotal = totalMinutes + elapsedMinutes;

      const { error } = await supabase
        .from("unified_tasks")
        .update({
          timer_running: false,
          timer_started_at: null,
          time_tracked_minutes: newTotal,
        })
        .eq("id", taskId);

      if (error) throw error;

      setIsRunning(false);
      setStartedAt(null);
      setTotalMinutes(newTotal);
      setElapsedSeconds(0);
      toast.success(`Logged ${elapsedMinutes} minutes`);
      onUpdate?.();
    } catch (error) {
      console.error("Error stopping timer:", error);
      toast.error("Failed to stop timer");
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant={isRunning ? "secondary" : "outline"}
          size="icon"
          className="h-7 w-7"
          onClick={isRunning ? stopTimer : startTimer}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : isRunning ? (
            <Square className="h-3 w-3" />
          ) : (
            <Play className="h-3 w-3" />
          )}
        </Button>
        {isRunning ? (
          <span className="font-mono text-xs tabular-nums text-destructive">
            {formatTime(elapsedSeconds)}
          </span>
        ) : totalMinutes > 0 ? (
          <span className="text-xs text-muted-foreground">
            {formatTotalTime(totalMinutes)}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Time Tracking
        </h4>
        {totalMinutes > 0 && (
          <Badge variant="secondary">
            Total: {formatTotalTime(totalMinutes)}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
        <Button
          variant={isRunning ? "secondary" : "default"}
          size="sm"
          onClick={isRunning ? stopTimer : startTimer}
          disabled={loading}
          className="gap-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isRunning ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <Square className="h-4 w-4" />
              Stop
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Start Timer
            </>
          )}
        </Button>

        {isRunning && (
          <div className="flex-1">
            <span className="font-mono text-lg font-semibold tabular-nums">
              {formatTime(elapsedSeconds)}
            </span>
            <p className="text-xs text-muted-foreground">
              Session in progress
            </p>
          </div>
        )}

        {!isRunning && totalMinutes === 0 && (
          <p className="text-sm text-muted-foreground">
            No time tracked yet
          </p>
        )}
      </div>
    </div>
  );
}

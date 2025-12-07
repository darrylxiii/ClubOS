import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Square, Loader2 } from "lucide-react";
import { useTimeTracking, formatDuration } from "@/hooks/useTimeTracking";
import { cn } from "@/lib/utils";

interface TimerButtonProps {
  projectId?: string;
  taskId?: string;
  description?: string;
  isBillable?: boolean;
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function TimerButton({
  projectId,
  taskId,
  description,
  isBillable = true,
  size = "default",
  className,
}: TimerButtonProps) {
  const { runningEntry, startTimer, stopTimer } = useTimeTracking();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const isRunning = !!runningEntry;
  const isLoading = startTimer.isPending || stopTimer.isPending;

  // Update elapsed time every second when running
  useEffect(() => {
    if (!runningEntry?.start_time) {
      setElapsedSeconds(0);
      return;
    }

    const updateElapsed = () => {
      const start = new Date(runningEntry.start_time!).getTime();
      const now = Date.now();
      setElapsedSeconds(Math.floor((now - start) / 1000));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [runningEntry?.start_time]);

  const handleClick = () => {
    if (isLoading) return;

    if (isRunning) {
      stopTimer.mutate(runningEntry.id);
    } else {
      startTimer.mutate({
        project_id: projectId,
        task_id: taskId,
        description,
        is_billable: isBillable,
      });
    }
  };

  const buttonSizes = {
    sm: "h-9 px-3",
    default: "h-11 px-4",
    lg: "h-14 px-6",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    default: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      size={size}
      className={cn(
        buttonSizes[size],
        "relative gap-3 transition-all duration-300",
        isRunning
          ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          : "bg-primary hover:bg-primary/90 text-primary-foreground",
        className
      )}
    >
      {isLoading ? (
        <Loader2 className={cn(iconSizes[size], "animate-spin")} />
      ) : isRunning ? (
        <>
          {/* Pulsing indicator */}
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <Square className={iconSizes[size]} />
          <span className="font-mono font-semibold tabular-nums">
            {formatDuration(elapsedSeconds)}
          </span>
        </>
      ) : (
        <>
          <Play className={iconSizes[size]} />
          <span>Start Timer</span>
        </>
      )}
    </Button>
  );
}

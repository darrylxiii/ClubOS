import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ActivityMonitoringIndicatorProps {
  activityPercentage: number;
  isTracking: boolean;
  className?: string;
}

/**
 * Visual indicator for real-time activity monitoring
 * Shows activity level with color-coded feedback
 */
export function ActivityMonitoringIndicator({
  activityPercentage,
  isTracking,
  className,
}: ActivityMonitoringIndicatorProps) {
  // Determine color based on activity level
  const getActivityColor = () => {
    if (!isTracking) return "text-muted-foreground";
    if (activityPercentage >= 60) return "text-green-500";
    if (activityPercentage >= 30) return "text-yellow-500";
    return "text-red-500";
  };

  const getActivityLabel = () => {
    if (!isTracking) return "Not tracking";
    if (activityPercentage >= 60) return "High activity";
    if (activityPercentage >= 30) return "Medium activity";
    if (activityPercentage > 0) return "Low activity";
    return "Idle";
  };

  const getActivityBgColor = () => {
    if (!isTracking) return "bg-muted";
    if (activityPercentage >= 60) return "bg-green-500/20";
    if (activityPercentage >= 30) return "bg-yellow-500/20";
    return "bg-red-500/20";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              getActivityBgColor(),
              className
            )}
          >
            <Activity
              className={cn("h-3.5 w-3.5", getActivityColor(), {
                "animate-pulse": isTracking && activityPercentage > 0,
              })}
            />
            <span className={cn("tabular-nums", getActivityColor())}>
              {isTracking ? `${activityPercentage}%` : "—"}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="font-medium">{getActivityLabel()}</p>
          <p className="text-xs text-muted-foreground">
            {isTracking
              ? "Activity level calculated from mouse/keyboard events"
              : "Start the timer to begin tracking activity"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

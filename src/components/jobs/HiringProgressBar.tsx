import { memo } from "react";
import { Target, Users, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface HiringProgressBarProps {
  /** Number of candidates hired */
  hiredCount: number;
  /** Target number of hires (null for unlimited/continuous) */
  targetCount: number | null;
  /** Show in compact mode */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export const HiringProgressBar = memo(({
  hiredCount,
  targetCount,
  compact = false,
  className,
}: HiringProgressBarProps) => {
  const hasTarget = targetCount !== null && targetCount > 0;
  const progressPercent = hasTarget ? Math.min(100, (hiredCount / targetCount) * 100) : 0;
  const isComplete = hasTarget && hiredCount >= targetCount;

  if (compact) {
    if (!hasTarget) {
      return (
        <span className={cn("text-xs text-muted-foreground", className)}>
          {hiredCount} hired
        </span>
      );
    }

    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden max-w-16">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isComplete ? "bg-green-500" : "bg-primary"
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {hiredCount}/{targetCount}
        </span>
      </div>
    );
  }

  if (!hasTarget) {
    return (
      <div className={cn(
        "flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/30",
        className
      )}>
        <div className="p-2 rounded-full bg-primary/10">
          <Users className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{hiredCount} Hired</p>
          <p className="text-xs text-muted-foreground">Continuous pipeline</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "p-4 rounded-lg bg-card/50 border border-border/30",
      isComplete && "border-green-500/30 bg-green-500/5",
      className
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isComplete ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <Target className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium text-foreground">
            {isComplete ? "Target Reached" : "Hiring Progress"}
          </span>
        </div>
        <span className={cn(
          "text-sm font-bold",
          isComplete ? "text-green-500" : "text-foreground"
        )}>
          {hiredCount}/{targetCount}
        </span>
      </div>
      
      <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isComplete ? "bg-green-500" : "bg-primary"
          )}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      
      <p className="text-xs text-muted-foreground mt-2">
        {isComplete 
          ? "All positions filled" 
          : `${targetCount - hiredCount} more to go`
        }
      </p>
    </div>
  );
});

HiringProgressBar.displayName = 'HiringProgressBar';
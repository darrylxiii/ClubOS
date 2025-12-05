import { Badge } from "@/components/ui/badge";
import { Infinity, Target, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContinuousPipelineBadgeProps {
  isContinuous: boolean;
  hiredCount?: number;
  targetHireCount?: number | null;
  size?: "sm" | "md" | "lg";
  showProgress?: boolean;
  className?: string;
}

export function ContinuousPipelineBadge({
  isContinuous,
  hiredCount = 0,
  targetHireCount,
  size = "md",
  showProgress = true,
  className,
}: ContinuousPipelineBadgeProps) {
  if (!isContinuous) return null;

  const isUnlimited = targetHireCount === null || targetHireCount === undefined;
  const progressPercent = !isUnlimited && targetHireCount > 0 
    ? Math.min((hiredCount / targetHireCount) * 100, 100) 
    : 0;
  const isComplete = !isUnlimited && hiredCount >= (targetHireCount || 0);

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-xs px-2 py-0.5",
    lg: "text-sm px-2.5 py-1",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-medium border-primary/30 bg-primary/5 text-primary",
        isComplete && "border-green-500/30 bg-green-500/5 text-green-600",
        sizeClasses[size],
        className
      )}
    >
      {isUnlimited ? (
        <>
          <Infinity className="h-3 w-3" />
          <span>Continuous</span>
          {showProgress && hiredCount > 0 && (
            <span className="ml-1 opacity-70">({hiredCount} hired)</span>
          )}
        </>
      ) : (
        <>
          <Users className="h-3 w-3" />
          <span>
            {hiredCount}/{targetHireCount}
          </span>
          {showProgress && (
            <div className="ml-1 h-1.5 w-8 rounded-full bg-primary/20 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  isComplete ? "bg-green-500" : "bg-primary"
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </>
      )}
    </Badge>
  );
}

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Infinity as InfinityIcon, Users, Euro, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContinuousPipelineBadgeProps {
  isContinuous: boolean;
  hiredCount?: number;
  targetHireCount?: number | null;
  size?: "sm" | "md" | "lg";
  showProgress?: boolean;
  showFinancials?: boolean;
  feePerPlacement?: number;
  className?: string;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `€${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `€${(value / 1000).toFixed(0)}k`;
  }
  return `€${value.toFixed(0)}`;
}

export function ContinuousPipelineBadge({
  isContinuous,
  hiredCount = 0,
  targetHireCount,
  size = "md",
  showProgress = true,
  showFinancials = false,
  feePerPlacement,
  className,
}: ContinuousPipelineBadgeProps) {
  if (!isContinuous) return null;

  const isUnlimited = targetHireCount === null || targetHireCount === undefined;
  const progressPercent = !isUnlimited && targetHireCount > 0 
    ? Math.min((hiredCount / targetHireCount) * 100, 100) 
    : 0;
  const isComplete = !isUnlimited && hiredCount >= (targetHireCount || 0);
  
  // Calculate financial projections
  const hasFinancials = showFinancials && feePerPlacement && feePerPlacement > 0;
  const totalProjected = hasFinancials && targetHireCount ? feePerPlacement * targetHireCount : 0;
  const realized = hasFinancials ? feePerPlacement * hiredCount : 0;
  const remaining = hasFinancials && targetHireCount ? feePerPlacement * (targetHireCount - hiredCount) : 0;

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-xs px-2 py-0.5",
    lg: "text-sm px-2.5 py-1",
  };

  const badgeContent = (
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
          <InfinityIcon className="h-3 w-3" />
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
          {hasFinancials && (
            <span className="ml-1 flex items-center gap-0.5 opacity-70">
              <Euro className="h-2.5 w-2.5" />
              {formatCurrency(realized)}/{formatCurrency(totalProjected)}
            </span>
          )}
        </>
      )}
    </Badge>
  );

  // Wrap with tooltip if showing financials
  if (hasFinancials && !isUnlimited) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badgeContent}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1.5 text-xs">
              <div className="font-medium flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Pipeline Projection
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <span className="text-muted-foreground">Fee per hire:</span>
                <span className="font-medium">{formatCurrency(feePerPlacement!)}</span>
                <span className="text-muted-foreground">Realized:</span>
                <span className="font-medium text-green-600">{formatCurrency(realized)}</span>
                <span className="text-muted-foreground">Remaining:</span>
                <span className="font-medium text-amber-600">{formatCurrency(remaining)}</span>
                <span className="text-muted-foreground">Total projected:</span>
                <span className="font-medium">{formatCurrency(totalProjected)}</span>
              </div>
              <div className="pt-1 border-t text-muted-foreground">
                {progressPercent.toFixed(0)}% complete
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badgeContent;
}

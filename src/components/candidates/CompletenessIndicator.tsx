import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface CompletenessIndicatorProps {
  score: number;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

export function CompletenessIndicator({ score, size = "sm", showLabel = false, className }: CompletenessIndicatorProps) {
  const radius = size === "sm" ? 12 : 16;
  const strokeWidth = size === "sm" ? 2.5 : 3;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const svgSize = (radius + strokeWidth) * 2;

  const getColor = () => {
    if (score >= 80) return "text-emerald-500";
    if (score >= 50) return "text-amber-500";
    return "text-red-400";
  };

  const getStrokeColor = () => {
    if (score >= 80) return "stroke-emerald-500";
    if (score >= 50) return "stroke-amber-500";
    return "stroke-red-400";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-1.5", className)}>
            <svg width={svgSize} height={svgSize} className="transform -rotate-90">
              <circle
                cx={radius + strokeWidth}
                cy={radius + strokeWidth}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-muted/30"
              />
              <circle
                cx={radius + strokeWidth}
                cy={radius + strokeWidth}
                r={radius}
                fill="none"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className={getStrokeColor()}
              />
            </svg>
            {showLabel && (
              <span className={cn("text-xs font-medium tabular-nums", getColor())}>
                {score}%
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          Profile completeness: {score}%
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

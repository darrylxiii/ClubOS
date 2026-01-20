import { memo } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle, Circle, Clock, XCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  candidateCount: number;
  avgDaysInStage?: number;
  status?: "active" | "completed" | "blocked";
}

interface PipelineStageProgressProps {
  stages: PipelineStage[];
  totalCandidates: number;
  currentStageIndex?: number;
  variant?: "horizontal" | "vertical";
  size?: "sm" | "md" | "lg";
  showCounts?: boolean;
  className?: string;
}

const getStageIcon = (status: PipelineStage["status"], size: "sm" | "md" | "lg") => {
  const sizeClass = size === "sm" ? "w-3 h-3" : size === "md" ? "w-4 h-4" : "w-5 h-5";
  
  switch (status) {
    case "completed":
      return <CheckCircle className={cn(sizeClass, "text-green-500")} />;
    case "blocked":
      return <XCircle className={cn(sizeClass, "text-red-500")} />;
    default:
      return <Circle className={cn(sizeClass, "text-muted-foreground")} />;
  }
};

export const PipelineStageProgress = memo(({
  stages,
  totalCandidates,
  currentStageIndex = 0,
  variant = "horizontal",
  size = "md",
  showCounts = true,
  className,
}: PipelineStageProgressProps) => {
  const maxCandidates = Math.max(...stages.map(s => s.candidateCount), 1);

  if (variant === "vertical") {
    return (
      <div className={cn("space-y-2", className)}>
        {stages.map((stage, index) => {
          const widthPercent = (stage.candidateCount / maxCandidates) * 100;
          const isActive = index === currentStageIndex;
          
          return (
            <TooltipProvider key={stage.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "flex items-center gap-3 p-2 rounded-lg transition-all",
                    isActive && "bg-primary/10 border border-primary/20"
                  )}>
                    {getStageIcon(stage.status, size)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn(
                          "text-sm font-medium truncate",
                          isActive && "text-primary"
                        )}>
                          {stage.name}
                        </span>
                        {showCounts && (
                          <span className="text-xs text-muted-foreground ml-2">
                            {stage.candidateCount}
                          </span>
                        )}
                      </div>
                      <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            isActive ? "bg-primary" : "bg-muted-foreground/30"
                          )}
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-sm">
                    <p className="font-medium">{stage.name}</p>
                    <p className="text-muted-foreground">
                      {stage.candidateCount} candidates
                      {stage.avgDaysInStage !== undefined && (
                        <> · Avg {stage.avgDaysInStage}d</>
                      )}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    );
  }

  // Horizontal variant
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {stages.map((stage, index) => {
        const widthPercent = Math.max(10, (stage.candidateCount / totalCandidates) * 100);
        const isActive = index === currentStageIndex;
        const isLast = index === stages.length - 1;

        return (
          <TooltipProvider key={stage.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className={cn(
                    "relative h-8 rounded transition-all cursor-default",
                    isActive ? "bg-primary/20" : "bg-muted/30",
                    !isLast && "flex-1"
                  )}
                  style={{ minWidth: isLast ? '40px' : undefined }}
                >
                  <div
                    className={cn(
                      "h-full rounded transition-all duration-500",
                      stage.status === "completed" ? "bg-green-500" :
                      stage.status === "blocked" ? "bg-red-500" :
                      isActive ? "bg-primary" : "bg-muted-foreground/40"
                    )}
                    style={{ width: `${widthPercent}%` }}
                  />
                  {showCounts && stage.candidateCount > 0 && (
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-foreground">
                      {stage.candidateCount}
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm">
                  <p className="font-medium">{stage.name}</p>
                  <p className="text-muted-foreground">
                    {stage.candidateCount} candidates
                    {stage.avgDaysInStage !== undefined && (
                      <> · Avg {stage.avgDaysInStage}d in stage</>
                    )}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
});

PipelineStageProgress.displayName = 'PipelineStageProgress';
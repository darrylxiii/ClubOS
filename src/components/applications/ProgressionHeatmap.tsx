import { Progress } from "@/components/ui/progress";
import { TrendingUp } from "lucide-react";

interface ProgressionHeatmapProps {
  currentStage: number;
  totalStages: number;
  daysInProcess?: number;
  averageDays?: number;
}

export function ProgressionHeatmap({ 
  currentStage, 
  totalStages,
  daysInProcess = 0,
  averageDays = 0 
}: ProgressionHeatmapProps) {
  const progressPercent = Math.round((currentStage / totalStages) * 100);
  const speedComparison = averageDays > 0 ? ((averageDays - daysInProcess) / averageDays) * 100 : 0;

  return (
    <div className="p-6 rounded-2xl bg-card border border-border/50 h-full flex flex-col">
      <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-4">
        Pipeline Progress
      </div>
      
      <div className="flex items-end justify-between mb-3">
        <div className="text-5xl font-bold">{progressPercent}%</div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground mb-1">Stage</div>
          <div className="text-2xl font-bold">
            {currentStage + 1}/{totalStages}
          </div>
        </div>
      </div>
      
      <Progress value={progressPercent} className="h-2 mb-3" />
      
      <div className="flex items-center gap-2 text-sm mt-auto">
        <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
        <span className="font-semibold text-green-600 dark:text-green-400">
          {Math.abs(Math.round(speedComparison))}% faster
        </span>
        <span className="text-muted-foreground">vs average</span>
      </div>
    </div>
  );
}

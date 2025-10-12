import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

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
  
  let speedStatus: 'faster' | 'average' | 'slower' = 'average';
  if (speedComparison > 15) speedStatus = 'faster';
  if (speedComparison < -15) speedStatus = 'slower';

  return (
    <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Pipeline Progress</div>
          <div className="text-2xl font-bold mt-1">{progressPercent}%</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Stage</div>
          <div className="text-lg font-semibold">
            {currentStage + 1}/{totalStages}
          </div>
        </div>
      </div>
      
      <Progress value={progressPercent} className="h-2" />
      
      <div className="flex items-center gap-2 text-xs">
        <div className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-full",
          speedStatus === 'faster' && "bg-green-500/10 text-green-600 dark:text-green-400",
          speedStatus === 'average' && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
          speedStatus === 'slower' && "bg-orange-500/10 text-orange-600 dark:text-orange-400"
        )}>
          {speedStatus === 'faster' && <TrendingUp className="w-3 h-3" />}
          {speedStatus === 'average' && <Minus className="w-3 h-3" />}
          {speedStatus === 'slower' && <TrendingDown className="w-3 h-3" />}
          <span className="font-medium">
            {speedStatus === 'faster' && `${Math.abs(Math.round(speedComparison))}% faster`}
            {speedStatus === 'average' && 'On pace'}
            {speedStatus === 'slower' && `${Math.abs(Math.round(speedComparison))}% slower`}
          </span>
        </div>
        <span className="text-muted-foreground">vs average</span>
      </div>
    </div>
  );
}

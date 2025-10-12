import { Progress } from "@/components/ui/progress";
import { TrendingUp, Clock } from "lucide-react";

interface ProgressionHeatmapProps {
  currentStage: number;
  totalStages: number;
  daysInProcess: number;
  averageDays: number;
}

export function ProgressionHeatmap({ 
  currentStage, 
  totalStages, 
  daysInProcess,
  averageDays 
}: ProgressionHeatmapProps) {
  const progressPercent = ((currentStage + 1) / totalStages) * 100;
  const speedVsAverage = averageDays > 0 ? ((averageDays - daysInProcess) / averageDays) * 100 : 0;
  const isFaster = speedVsAverage > 0;

  return (
    <div className="p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 h-full flex flex-col">
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Progress</div>
      
      <div className="space-y-3 flex-1">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">Pipeline</span>
            <span className="text-xs font-semibold">{currentStage + 1}/{totalStages}</span>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>

        <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
          <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground">In process</div>
            <div className="text-sm font-semibold">{daysInProcess} days</div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
          <TrendingUp className={`w-3.5 h-3.5 flex-shrink-0 ${isFaster ? 'text-green-500' : 'text-amber-500'}`} />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground">vs Average</div>
            <div className={`text-sm font-semibold ${isFaster ? 'text-green-500' : 'text-amber-500'}`}>
              {isFaster ? `${Math.abs(Math.round(speedVsAverage))}% faster` : `${Math.abs(Math.round(speedVsAverage))}% slower`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

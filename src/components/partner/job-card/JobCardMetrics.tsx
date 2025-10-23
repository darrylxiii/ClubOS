import { memo } from "react";
import { Users, Clock, TrendingUp } from "lucide-react";
import { getDaysOpenColor, getConversionColor } from "@/lib/jobUtils";

interface JobCardMetricsProps {
  candidateCount: number;
  activeStageCount: number;
  daysSinceOpened: number;
  conversionRate: number | null;
}

export const JobCardMetrics = memo(({
  candidateCount,
  activeStageCount,
  daysSinceOpened,
  conversionRate
}: JobCardMetricsProps) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Candidates */}
      <div className="p-3 rounded-lg bg-card/20 backdrop-blur-sm border border-border/20 hover:border-border/40 transition-all">
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-4 h-4 text-white" />
          <span className="text-xs text-muted-foreground">Candidates</span>
        </div>
        <p className="text-2xl font-bold text-white">{candidateCount}</p>
        <p className="text-xs text-muted-foreground">{activeStageCount} active</p>
      </div>

      {/* Days Open */}
      <div className="p-3 rounded-lg bg-card/20 backdrop-blur-sm border border-border/20 hover:border-border/40 transition-all">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-4 h-4 text-white" />
          <span className="text-xs text-muted-foreground">Days Open</span>
        </div>
        <p className={`text-2xl font-bold ${getDaysOpenColor(daysSinceOpened)}`}>
          {daysSinceOpened}d
        </p>
        <p className="text-xs text-muted-foreground">since opened</p>
      </div>

      {/* Conversion */}
      <div className="p-3 rounded-lg bg-card/20 backdrop-blur-sm border border-border/20 hover:border-border/40 transition-all col-span-2">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4 text-white" />
          <span className="text-xs text-muted-foreground">Conversion Rate</span>
        </div>
        <p className={`text-2xl font-bold ${getConversionColor(conversionRate)}`}>
          {conversionRate !== null ? `${conversionRate}%` : '—'}
        </p>
        <p className="text-xs text-muted-foreground">hired rate</p>
      </div>
    </div>
  );
});

JobCardMetrics.displayName = 'JobCardMetrics';

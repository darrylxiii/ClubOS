import { memo } from "react";
import { Users, Clock, TrendingUp, Target, Calendar } from "lucide-react";
import { getDaysOpenColor, getConversionColor } from "@/lib/jobUtils";
import { cn } from "@/lib/utils";
import { JobSparkline } from "./JobSparkline";
import { JobNextAction } from "./JobNextAction";

interface JobCardMetricsProps {
  jobId: string;
  candidateCount: number;
  activeStageCount: number;
  daysSinceOpened: number;
  conversionRate: number | null;
  hiredCount?: number;
  targetHireCount?: number | null;
  lastActivityDays?: number | null;
  interviewsThisWeek?: number;
}

const MetricCard = memo(({ 
  icon: Icon, 
  label, 
  value, 
  subtext, 
  valueClassName,
  children,
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number; 
  subtext?: string;
  valueClassName?: string;
  children?: React.ReactNode;
}) => (
  <div className="p-3 rounded-lg bg-card/20 backdrop-blur-sm border border-border/20 hover:border-border/40 transition-all">
    <div className="flex items-center gap-2 mb-1">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
    <div className="flex items-center justify-between">
      <p className={cn("text-2xl font-bold text-foreground", valueClassName)}>
        {value}
      </p>
      {children}
    </div>
    {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
  </div>
));

MetricCard.displayName = 'MetricCard';

export const JobCardMetrics = memo(({
  jobId,
  candidateCount,
  activeStageCount,
  daysSinceOpened,
  conversionRate,
  hiredCount = 0,
  targetHireCount,
  lastActivityDays,
  interviewsThisWeek = 0,
}: JobCardMetricsProps) => {
  const showProgress = targetHireCount && targetHireCount > 0;
  const progressPercent = showProgress ? Math.min(100, (hiredCount / targetHireCount) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* AI Next Action Prompt */}
      <JobNextAction
        candidateCount={candidateCount}
        activeStageCount={activeStageCount}
        daysOpen={daysSinceOpened}
        conversionRate={conversionRate}
        lastActivityDays={lastActivityDays}
      />

      <div className="grid grid-cols-2 gap-3">
        {/* Candidates with Sparkline */}
        <MetricCard
          icon={Users}
          label="Candidates"
          value={candidateCount}
          subtext={`${activeStageCount} active`}
        >
          <JobSparkline 
            jobId={jobId} 
            candidateCount={candidateCount} 
            daysOpen={daysSinceOpened} 
          />
        </MetricCard>

        <MetricCard
          icon={Clock}
          label="Days Open"
          value={`${daysSinceOpened}d`}
          valueClassName={getDaysOpenColor(daysSinceOpened)}
          subtext="since opened"
        />

        {showProgress ? (
          <div className="p-3 rounded-lg bg-card/20 backdrop-blur-sm border border-border/20 hover:border-border/40 transition-all col-span-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Hiring Progress</span>
              </div>
              <span className="text-sm font-medium text-foreground">
                {hiredCount}/{targetHireCount}
              </span>
            </div>
            <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round(progressPercent)}% complete
            </p>
          </div>
        ) : (
          <>
            <div className="p-3 rounded-lg bg-card/20 backdrop-blur-sm border border-border/20 hover:border-border/40 transition-all">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Conversion</span>
              </div>
              <p className={cn("text-2xl font-bold", conversionRate !== null ? getConversionColor(conversionRate) : "text-foreground")}>
                {conversionRate !== null ? `${conversionRate}%` : '—'}
              </p>
              <p className="text-xs text-muted-foreground">hired rate</p>
            </div>

            {/* Interviews This Week */}
            <div className="p-3 rounded-lg bg-card/20 backdrop-blur-sm border border-border/20 hover:border-border/40 transition-all">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Interviews</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {interviewsThisWeek}
              </p>
              <p className="text-xs text-muted-foreground">this week</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
});

JobCardMetrics.displayName = 'JobCardMetrics';

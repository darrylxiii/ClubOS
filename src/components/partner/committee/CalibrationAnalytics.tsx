import { useTranslation } from 'react-i18next';
import { motion } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { GlassMetricCard } from '@/components/partner/shared/GlassMetricCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BarChart3,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Target,
} from 'lucide-react';
import type { CalibrationData, ReviewerCalibration } from '@/hooks/useCalibrationSession';

interface CalibrationAnalyticsProps {
  data: CalibrationData | null;
  isLoading: boolean;
}

// ── Reviewer row ────────────────────────────────────────────────
function ReviewerRow({
  reviewer,
  teamAvg,
  index,
}: {
  reviewer: ReviewerCalibration;
  teamAvg: number;
  index: number;
}) {
  const { t } = useTranslation('partner');
  const initials = reviewer.evaluator_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const isHarsh = reviewer.deviationPct > 15;
  const isLenient = reviewer.deviationPct < -15;
  const isConsistent = reviewer.variance < 0.5;

  // Build human-readable insight
  let insight = '';
  if (isHarsh) {
    insight = t('committee.calibration.insightHarsh', 'Rates {{pct}}% harsher than average', {
      pct: Math.abs(reviewer.deviationPct),
    });
  } else if (isLenient) {
    insight = t('committee.calibration.insightLenient', 'Rates {{pct}}% more lenient than average', {
      pct: Math.abs(reviewer.deviationPct),
    });
  } else if (isConsistent) {
    insight = t('committee.calibration.insightConsistent', 'Highly consistent scorer');
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      className="flex items-center gap-3 p-3 rounded-lg bg-card/20 hover:bg-card/40 transition-colors"
      role="listitem"
    >
      {/* Avatar */}
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={reviewer.avatar_url} alt={reviewer.evaluator_name} />
        <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
      </Avatar>

      {/* Name + insight */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{reviewer.evaluator_name}</p>
        {insight && (
          <p className={cn(
            'text-xs mt-0.5',
            isHarsh ? 'text-rose-500' : isLenient ? 'text-amber-500' : 'text-emerald-500',
          )}>
            {isHarsh && <TrendingDown className="inline h-3 w-3 mr-0.5 -mt-0.5" />}
            {isLenient && <TrendingUp className="inline h-3 w-3 mr-0.5 -mt-0.5" />}
            {isConsistent && !isHarsh && !isLenient && <Target className="inline h-3 w-3 mr-0.5 -mt-0.5" />}
            {insight}
          </p>
        )}
      </div>

      {/* Avg score bar */}
      <div className="w-24 shrink-0 space-y-0.5">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{t('committee.calibration.avg', 'Avg')}</span>
          <span className="font-medium tabular-nums">{reviewer.avgScore}/5</span>
        </div>
        <Progress
          value={(reviewer.avgScore / 5) * 100}
          className="h-1.5"
        />
      </div>

      {/* Scorecards count badge */}
      <Badge variant="outline" className="text-[10px] shrink-0">
        {reviewer.scoreCount} {t('committee.calibration.reviews', 'reviews')}
      </Badge>

      {/* Variance indicator */}
      <div className="shrink-0 text-center w-10" title={t('committee.calibration.varianceTooltip', 'Score variance (lower is more consistent)')}>
        <span className={cn(
          'text-xs font-medium tabular-nums',
          reviewer.variance < 0.5 ? 'text-emerald-500' : reviewer.variance < 1 ? 'text-amber-500' : 'text-rose-500',
        )}>
          {reviewer.variance.toFixed(1)}
        </span>
        <p className="text-[9px] text-muted-foreground leading-tight">
          {t('committee.calibration.var', 'var')}
        </p>
      </div>
    </motion.div>
  );
}

// ── Skeleton loader ─────────────────────────────────────────────
function CalibrationSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────
export function CalibrationAnalytics({ data, isLoading }: CalibrationAnalyticsProps) {
  const { t } = useTranslation('partner');

  if (isLoading) return <CalibrationSkeleton />;

  if (!data || data.reviewers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center" role="status">
        <BarChart3 className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">
          {t('committee.calibration.emptyTitle', 'No calibration data yet')}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs">
          {t('committee.calibration.emptyDesc', 'Once reviewers submit scorecards, calibration insights will appear here.')}
        </p>
      </div>
    );
  }

  const highVarianceCount = data.reviewers.filter(r => r.variance >= 1).length;
  const harshCount = data.reviewers.filter(r => r.deviationPct > 15).length;

  return (
    <div className="space-y-6">
      {/* Summary metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassMetricCard
          icon={Users}
          label={t('committee.calibration.totalReviewers', 'Active Reviewers')}
          value={data.reviewers.length}
          subtitle={t('committee.calibration.totalScorecardsSubtitle', '{{count}} scorecards total', { count: data.totalScorecards })}
          color="primary"
          delay={0}
        />
        <GlassMetricCard
          icon={BarChart3}
          label={t('committee.calibration.teamAverage', 'Team Average Score')}
          value={`${data.teamAvgScore}/5`}
          trend={data.teamAvgScore >= 3.5 ? 'up' : data.teamAvgScore >= 2.5 ? 'neutral' : 'down'}
          trendLabel={`var ${data.teamScoreVariance.toFixed(1)}`}
          color="emerald"
          delay={0.05}
        />
        <GlassMetricCard
          icon={AlertTriangle}
          label={t('committee.calibration.calibrationAlerts', 'Calibration Alerts')}
          value={highVarianceCount + harshCount}
          subtitle={
            highVarianceCount > 0
              ? t('committee.calibration.highVarianceWarning', '{{count}} high-variance reviewers', { count: highVarianceCount })
              : t('committee.calibration.noAlerts', 'All reviewers well-calibrated')
          }
          color={highVarianceCount + harshCount > 0 ? 'amber' : 'emerald'}
          delay={0.1}
        />
      </div>

      {/* Team average reference line label */}
      <div className="flex items-center gap-2 px-1">
        <Minus className="h-3 w-3 text-primary" />
        <span className="text-xs text-muted-foreground">
          {t('committee.calibration.teamAvgLine', 'Team average: {{avg}}/5', { avg: data.teamAvgScore })}
        </span>
      </div>

      {/* Reviewer list */}
      <div
        className="space-y-2"
        role="list"
        aria-label={t('committee.calibration.reviewerListLabel', 'Reviewer calibration list')}
      >
        {data.reviewers.map((reviewer, i) => (
          <ReviewerRow
            key={reviewer.evaluator_id}
            reviewer={reviewer}
            teamAvg={data.teamAvgScore}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}

import { useTranslation } from 'react-i18next';
import { useRole } from '@/contexts/RoleContext';
import { usePredictiveHiring } from '@/hooks/usePredictiveHiring';
import { GlassMetricCard } from '@/components/partner/shared';
import { WorkforcePlanningWidget } from '@/components/partner/predictive/WorkforcePlanningWidget';
import { TimeToFillForecast } from '@/components/partner/predictive/TimeToFillForecast';
import { SalaryAdjustmentAdvisor } from '@/components/partner/predictive/SalaryAdjustmentAdvisor';
import { AcceptanceProbabilityCard } from '@/components/partner/predictive/AcceptanceProbabilityCard';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from '@/lib/motion';
import { Brain, Users, Clock, Target } from 'lucide-react';

function PredictiveSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading predictive intelligence">
      {/* Top row skeleton */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 rounded-xl bg-card/30 backdrop-blur border border-border/20">
            <div className="flex items-center gap-2 mb-3">
              <Skeleton className="h-7 w-7 rounded-lg" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Middle row skeleton */}
      <div className="p-5 rounded-xl bg-card/30 backdrop-blur border border-border/20">
        <Skeleton className="h-4 w-48 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-2 px-3 rounded-lg bg-muted/20">
              <Skeleton className="h-8 w-8" />
              <div className="flex-1">
                <Skeleton className="h-3 w-24 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom row skeleton */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <div className="p-5 rounded-xl bg-card/30 backdrop-blur border border-border/20">
          <Skeleton className="h-4 w-36 mb-4" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
        <div className="p-5 rounded-xl bg-card/30 backdrop-blur border border-border/20">
          <Skeleton className="h-4 w-36 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="p-3 rounded-lg bg-muted/20">
                <Skeleton className="h-3 w-32 mb-2" />
                <Skeleton className="h-6 w-full mb-2" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PredictiveIntelligence() {
  const { t } = useTranslation('partner');
  const { companyId } = useRole();
  const {
    workforcePlan,
    timeToFillPredictions,
    salaryInsights,
    avgAcceptanceProbability,
    avgPredictedTTF,
    ttfTrendData,
    isLoading,
    isError,
  } = usePredictiveHiring();

  // Guard: no company
  if (!companyId) {
    return (
      <EmptyState
        icon={Brain}
        title={t('predictive.noCompany', 'No company associated')}
        description={t(
          'predictive.noCompanyDesc',
          'Please ensure your account is linked to a company to view predictive intelligence.'
        )}
      />
    );
  }

  // Loading state
  if (isLoading) {
    return <PredictiveSkeleton />;
  }

  // Error state
  if (isError) {
    return (
      <EmptyState
        icon={Brain}
        title={t('predictive.error', 'Unable to load predictions')}
        description={t(
          'predictive.errorDesc',
          'There was a problem loading predictive intelligence data. Please try again later.'
        )}
      />
    );
  }

  // No data state
  if (
    workforcePlan.totalProjectedHires === 0 &&
    timeToFillPredictions.length === 0 &&
    salaryInsights.length === 0
  ) {
    return (
      <EmptyState
        icon={Brain}
        title={t('predictive.noData', 'Not enough data yet')}
        description={t(
          'predictive.noDataDesc',
          'Once you have active jobs and hiring history, predictive intelligence will generate forecasts here.'
        )}
      />
    );
  }

  // Trends for top cards
  const hireTrend =
    workforcePlan.quarterlyTrend.length >= 2
      ? workforcePlan.quarterlyTrend[workforcePlan.quarterlyTrend.length - 1] >=
        workforcePlan.quarterlyTrend[workforcePlan.quarterlyTrend.length - 2]
        ? 'up'
        : 'down'
      : ('neutral' as const);

  const ttfTrend =
    ttfTrendData.length >= 2
      ? ttfTrendData[ttfTrendData.length - 1] <= ttfTrendData[ttfTrendData.length - 2]
        ? 'up' // lower TTF is better, so trending down = "up" (good)
        : 'down'
      : ('neutral' as const);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
      role="main"
      aria-label={t('predictive.title', 'Predictive Hiring Intelligence')}
    >
      {/* ── Top row: 3 metric cards ─────────────────────────────── */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <GlassMetricCard
          icon={Users}
          label={t('predictive.projectedHires', 'Projected Hires')}
          value={workforcePlan.totalProjectedHires}
          trend={hireTrend}
          sparklineData={workforcePlan.quarterlyTrend}
          color="primary"
          delay={0}
        />
        <GlassMetricCard
          icon={Clock}
          label={t('predictive.avgPredictedTTF', 'Avg Predicted Time-to-Fill')}
          value={`${avgPredictedTTF}d`}
          trend={ttfTrend}
          sparklineData={ttfTrendData}
          color="amber"
          subtitle={t('predictive.days', 'days')}
          delay={0.05}
        />
        <GlassMetricCard
          icon={Target}
          label={t('predictive.avgAcceptance', 'Avg Acceptance Probability')}
          value={`${avgAcceptanceProbability}%`}
          color={avgAcceptanceProbability >= 70 ? 'emerald' : avgAcceptanceProbability >= 50 ? 'amber' : 'rose'}
          delay={0.1}
        />
      </div>

      {/* ── Middle: Workforce Planning (full width) ─────────────── */}
      <WorkforcePlanningWidget plan={workforcePlan} />

      {/* ── Bottom row: TTF Forecast + Salary Advisor ───────────── */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <TimeToFillForecast
          predictions={timeToFillPredictions}
          trendData={ttfTrendData}
        />
        <SalaryAdjustmentAdvisor insights={salaryInsights} />
      </div>

      {/* ── Acceptance Probability (summary view) ───────────────── */}
      {avgAcceptanceProbability > 0 && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <AcceptanceProbabilityCard
            probability={avgAcceptanceProbability}
            confidence={timeToFillPredictions.length > 0 ? 72 : 55}
          />
        </div>
      )}
    </motion.div>
  );
}

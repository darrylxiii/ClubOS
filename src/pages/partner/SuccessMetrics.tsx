import { useTranslation } from 'react-i18next';
import { useRole } from '@/contexts/RoleContext';
import { useSuccessMetrics } from '@/hooks/useSuccessMetrics';
import { GlassMetricCard } from '@/components/partner/shared';
import { RetentionTracker } from '@/components/partner/success/RetentionTracker';
import { ROIPerPlacement } from '@/components/partner/success/ROIPerPlacement';
import { QualityOfHireComposite } from '@/components/partner/success/QualityOfHireComposite';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from '@/lib/motion';
import { Users, Clock, Shield, Award, BarChart3 } from 'lucide-react';

function MetricsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading metrics">
      {/* Top row skeleton */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 rounded-xl bg-card/30 backdrop-blur border border-border/20">
            <div className="flex items-center gap-2 mb-3">
              <Skeleton className="h-7 w-7 rounded-lg" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Middle row skeleton */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <div className="p-6 rounded-xl bg-card/30 backdrop-blur border border-border/20">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-12 w-24 mb-4" />
          <Skeleton className="h-3 w-full" />
        </div>
        <div className="p-6 rounded-xl bg-card/30 backdrop-blur border border-border/20">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-12 w-24 mb-4" />
          <Skeleton className="h-8 w-full mb-2" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>

      {/* Bottom row skeleton */}
      <div className="p-6 rounded-xl bg-card/30 backdrop-blur border border-border/20">
        <Skeleton className="h-4 w-48 mb-6" />
        <div className="flex items-center gap-8">
          <Skeleton className="h-24 w-24 rounded-full shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SuccessMetrics() {
  const { t } = useTranslation('partner');
  const { companyId } = useRole();
  const metrics = useSuccessMetrics(companyId);

  // Guard: no company
  if (!companyId) {
    return (
      <EmptyState
        icon={BarChart3}
        title={t('successMetrics.noCompany', 'No company associated')}
        description={t('successMetrics.noCompanyDesc', 'Please ensure your account is linked to a company to view success metrics.')}
      />
    );
  }

  // Loading state
  if (metrics.isLoading) {
    return <MetricsSkeleton />;
  }

  // Error state
  if (metrics.error) {
    return (
      <EmptyState
        icon={BarChart3}
        title={t('successMetrics.error', 'Unable to load metrics')}
        description={t('successMetrics.errorDesc', 'There was a problem loading your success metrics. Please try again later.')}
      />
    );
  }

  // No data state
  if (metrics.totalHires === 0 && metrics.totalFees === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title={t('successMetrics.noData', 'No success data yet')}
        description={t('successMetrics.noDataDesc', 'Once you start making placements, your success metrics will appear here.')}
      />
    );
  }

  // Determine trends for top-row cards
  const hireTrend = metrics.monthlyHires.length >= 2
    ? (metrics.monthlyHires[metrics.monthlyHires.length - 1] >= metrics.monthlyHires[metrics.monthlyHires.length - 2] ? 'up' : 'down')
    : 'neutral' as const;

  const retentionTrend = metrics.monthlyRetention.length >= 2
    ? (metrics.monthlyRetention[metrics.monthlyRetention.length - 1] >= metrics.monthlyRetention[metrics.monthlyRetention.length - 2] ? 'up' : 'down')
    : 'neutral' as const;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
      role="main"
      aria-label={t('successMetrics.title', 'Success Metrics Dashboard')}
    >
      {/* ── Top row: 4 metric cards ─────────────────────────────── */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <GlassMetricCard
          icon={Users}
          label={t('successMetrics.totalHires', 'Total Hires')}
          value={metrics.totalHires}
          trend={hireTrend}
          sparklineData={metrics.monthlyHires}
          color="primary"
          delay={0}
        />
        <GlassMetricCard
          icon={Clock}
          label={t('successMetrics.avgTimeToHire', 'Avg Time to Hire')}
          value={`${metrics.avgTimeToHire}d`}
          subtitle={t('successMetrics.days', 'days')}
          color="amber"
          delay={0.05}
        />
        <GlassMetricCard
          icon={Shield}
          label={t('successMetrics.retention90d', '90-Day Retention')}
          value={`${metrics.retentionRate90d}%`}
          trend={retentionTrend}
          sparklineData={metrics.monthlyRetention}
          color="emerald"
          delay={0.1}
        />
        <GlassMetricCard
          icon={Award}
          label={t('successMetrics.qualityScoreLabel', 'Quality Score')}
          value={metrics.qualityScore}
          subtitle={t('successMetrics.outOf100', 'out of 100')}
          color={metrics.qualityScore >= 80 ? 'emerald' : metrics.qualityScore >= 60 ? 'amber' : 'rose'}
          delay={0.15}
        />
      </div>

      {/* ── Middle row: Retention + ROI side by side ────────────── */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <RetentionTracker
          retentionRate={metrics.retentionRate90d}
          monthlyRetention={metrics.monthlyRetention}
        />
        <ROIPerPlacement
          avgROI={metrics.avgROI}
          monthlyROI={metrics.monthlyROI}
          totalFees={metrics.totalFees}
          avgFeePerHire={metrics.avgFeePerHire}
        />
      </div>

      {/* ── Bottom: Quality of Hire Composite ───────────────────── */}
      <QualityOfHireComposite
        qualityScore={metrics.qualityScore}
        retentionRate={metrics.retentionRate90d}
        avgTimeToHire={metrics.avgTimeToHire}
      />
    </motion.div>
  );
}

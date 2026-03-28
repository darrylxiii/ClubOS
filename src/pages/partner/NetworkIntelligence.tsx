import { useTranslation } from 'react-i18next';
import { motion } from '@/lib/motion';
import { useRole } from '@/contexts/RoleContext';
import { Award, Clock, CheckCircle, Globe } from 'lucide-react';
import { GlassMetricCard } from '@/components/partner/shared/GlassMetricCard';
import { AnonymizedBenchmarks } from '@/components/partner/network/AnonymizedBenchmarks';
import { IndustryTrendsChart } from '@/components/partner/network/IndustryTrendsChart';
import { CompaniesLikeYours } from '@/components/partner/network/CompaniesLikeYours';
import { useAnonymizedBenchmarks } from '@/hooks/useAnonymizedBenchmarks';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Top row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      {/* Middle */}
      <Skeleton className="h-80 rounded-xl" />
      {/* Bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

export default function NetworkIntelligence() {
  const { t } = useTranslation('partner');
  const { companyId } = useRole();
  const { data, isLoading, isError } = useAnonymizedBenchmarks();

  if (!companyId) {
    return (
      <EmptyState
        icon={Globe}
        title={t('networkIntelligence.noCompany.title', 'No Company Selected')}
        description={t(
          'networkIntelligence.noCompany.description',
          'Select a company to view network intelligence and benchmarks.',
        )}
      />
    );
  }

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError) {
    return (
      <EmptyState
        icon={Globe}
        title={t('networkIntelligence.error.title', 'Unable to Load Intelligence')}
        description={t(
          'networkIntelligence.error.description',
          'Something went wrong loading network data. Please try again later.',
        )}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Top row: key metric cards ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <GlassMetricCard
          icon={Award}
          label={t('networkIntelligence.cards.yourPercentile', 'Your Percentile')}
          value={`${data.overallPercentile}th`}
          trend={data.overallPercentile >= 60 ? 'up' : data.overallPercentile >= 40 ? 'neutral' : 'down'}
          trendLabel={
            data.overallPercentile >= 60
              ? t('networkIntelligence.cards.aboveAvg', 'Above avg')
              : data.overallPercentile >= 40
              ? t('networkIntelligence.cards.nearAvg', 'Near avg')
              : t('networkIntelligence.cards.belowAvg', 'Below avg')
          }
          color={data.overallPercentile >= 60 ? 'emerald' : data.overallPercentile >= 40 ? 'amber' : 'rose'}
          subtitle={t('networkIntelligence.cards.percentileSubtitle', 'Across all network metrics')}
          delay={0}
        />
        <GlassMetricCard
          icon={Clock}
          label={t('networkIntelligence.cards.networkTTF', 'Network Avg Time to Fill')}
          value={
            data.networkAvgTimeToFill != null
              ? `${Math.round(data.networkAvgTimeToFill)} days`
              : '--'
          }
          color="amber"
          subtitle={t('networkIntelligence.cards.ttfSubtitle', 'Average across all partners')}
          delay={0.08}
        />
        <GlassMetricCard
          icon={CheckCircle}
          label={t('networkIntelligence.cards.networkAcceptance', 'Network Avg Acceptance')}
          value={
            data.networkAvgOfferAcceptance != null
              ? `${Math.round(data.networkAvgOfferAcceptance)}%`
              : '--'
          }
          color="emerald"
          subtitle={t('networkIntelligence.cards.acceptanceSubtitle', 'Offer acceptance rate')}
          delay={0.16}
        />
      </motion.div>

      {/* ── Middle: benchmark comparison table ────────────────────── */}
      <AnonymizedBenchmarks />

      {/* ── Bottom: trends + companies side by side ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IndustryTrendsChart />
        <CompaniesLikeYours />
      </div>
    </div>
  );
}

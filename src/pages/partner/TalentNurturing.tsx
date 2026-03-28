import { useTranslation } from 'react-i18next';
import { motion } from '@/lib/motion';
import { useRole } from '@/contexts/RoleContext';
import { useNurturingSequence } from '@/hooks/useNurturingSequence';
import { GlassMetricCard } from '@/components/partner/shared';
import { SilverMedalistPool } from '@/components/partner/nurturing/SilverMedalistPool';
import { ReengagementSignals } from '@/components/partner/nurturing/ReengagementSignals';
import { NurturingSequenceBuilder } from '@/components/partner/nurturing/NurturingSequenceBuilder';
import { EmptyState } from '@/components/EmptyState';
import { Loader2, Users, RefreshCcw, TrendingUp, Sprout } from 'lucide-react';

export default function TalentNurturing() {
  const { t } = useTranslation('partner');
  const { companyId } = useRole();

  const {
    silverMedalists,
    reengagementSignals,
    poolSize,
    reengagedThisMonth,
    conversionRate,
    isLoading,
  } = useNurturingSequence(companyId);

  // ── Guard: no company ───────────────────────────────────────────
  if (!companyId) {
    return (
      <EmptyState
        icon={Sprout}
        title={t('nurturing.noCompany', 'No company linked')}
        description={t(
          'nurturing.noCompanyDesc',
          'Talent pool nurturing will be available once your company profile is set up.',
        )}
      />
    );
  }

  // ── Loading ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Sprout className="h-5 w-5 text-emerald-500" />
          {t('nurturing.title', 'Talent Pool Nurturing')}
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t(
            'nurturing.subtitle',
            'Re-engage high-quality candidates from your silver medalist pool',
          )}
        </p>
      </motion.div>

      {/* Top metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassMetricCard
          icon={Users}
          label={t('nurturing.metrics.poolSize', 'Pool Size')}
          value={poolSize}
          trend={poolSize > 0 ? 'up' : 'neutral'}
          color="primary"
          subtitle={t('nurturing.metrics.silverMedalists', 'Silver medalists')}
          delay={0}
        />
        <GlassMetricCard
          icon={RefreshCcw}
          label={t('nurturing.metrics.reengaged', 'Re-engaged This Month')}
          value={reengagedThisMonth}
          trend={reengagedThisMonth > 0 ? 'up' : 'neutral'}
          trendLabel={reengagedThisMonth > 0 ? `+${reengagedThisMonth}` : undefined}
          color="emerald"
          subtitle={t('nurturing.metrics.last30Days', 'Last 30 days')}
          delay={0.05}
        />
        <GlassMetricCard
          icon={TrendingUp}
          label={t('nurturing.metrics.conversionRate', 'Conversion Rate')}
          value={`${conversionRate}%`}
          trend={
            conversionRate >= 15 ? 'up' : conversionRate >= 5 ? 'neutral' : 'down'
          }
          color={conversionRate >= 15 ? 'emerald' : conversionRate >= 5 ? 'amber' : 'rose'}
          subtitle={t('nurturing.metrics.reengagementRate', 'Re-engagement rate')}
          delay={0.1}
        />
      </div>

      {/* Silver Medalist Pool (full width) */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
        className="glass-card p-5 rounded-xl bg-card/30 backdrop-blur border border-border/20"
      >
        <SilverMedalistPool medalists={silverMedalists} />
      </motion.div>

      {/* Bottom row: Signals + Sequence Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="glass-card p-5 rounded-xl bg-card/30 backdrop-blur border border-border/20"
        >
          <ReengagementSignals signals={reengagementSignals} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.3 }}
          className="glass-card p-5 rounded-xl bg-card/30 backdrop-blur border border-border/20"
        >
          <NurturingSequenceBuilder />
        </motion.div>
      </div>
    </div>
  );
}

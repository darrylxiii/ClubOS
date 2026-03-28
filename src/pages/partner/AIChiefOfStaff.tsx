import { useTranslation } from 'react-i18next';
import { useRole } from '@/contexts/RoleContext';
import { useAIChiefOfStaff } from '@/hooks/useAIChiefOfStaff';
import { PrioritizedActionList } from '@/components/partner/chief-of-staff/PrioritizedActionList';
import { BottleneckFlagPanel } from '@/components/partner/chief-of-staff/BottleneckFlagPanel';
import { WeeklyUpdateGenerator } from '@/components/partner/chief-of-staff/WeeklyUpdateGenerator';
import { ProactiveInsightsFeed } from '@/components/partner/chief-of-staff/ProactiveInsightsFeed';
import { ThreatSummaryStrip } from '@/components/partner/chief-of-staff/ThreatSummaryStrip';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from '@/lib/motion';
import { Sparkles } from 'lucide-react';

// ── Skeleton ───────────────────────────────────────────────────────

function ChiefOfStaffSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading AI Chief of Staff">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <div className="space-y-1">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-64" />
        </div>
      </div>

      {/* Threat strip skeleton */}
      <Skeleton className="h-10 w-full rounded-xl" />

      {/* Main grid skeleton */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-5">
        {/* Left column */}
        <div className="lg:col-span-3 space-y-4">
          <div className="p-6 rounded-xl bg-card/20 backdrop-blur border border-border/20">
            <Skeleton className="h-4 w-40 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-card/10">
                  <Skeleton className="h-6 w-6 rounded-full shrink-0" />
                  <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-xl bg-card/20 backdrop-blur border border-border/20">
            <Skeleton className="h-4 w-36 mb-4" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          </div>
          <div className="p-5 rounded-xl bg-card/20 backdrop-blur border border-border/20">
            <Skeleton className="h-4 w-32 mb-4" />
            <div className="grid grid-cols-2 gap-2 mb-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-20 w-full rounded-lg mb-3" />
            <div className="flex gap-2">
              <Skeleton className="h-8 flex-1 rounded" />
              <Skeleton className="h-8 flex-1 rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom insights skeleton */}
      <div className="p-6 rounded-xl bg-card/20 backdrop-blur border border-border/20">
        <Skeleton className="h-4 w-40 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-[30px] w-[30px] rounded-full shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────

export default function AIChiefOfStaff() {
  const { t } = useTranslation('partner');
  const { companyId } = useRole();
  const {
    prioritizedActions,
    bottlenecks,
    weeklyUpdate,
    proactiveInsights,
    threatSummary,
    isLoading,
    isError,
  } = useAIChiefOfStaff();

  // Guard: no company
  if (!companyId) {
    return (
      <EmptyState
        icon={Sparkles}
        title={t('chiefOfStaff.noCompany', 'No company associated')}
        description={t(
          'chiefOfStaff.noCompanyDesc',
          'Please ensure your account is linked to a company to access the AI Chief of Staff.',
        )}
      />
    );
  }

  // Loading
  if (isLoading) {
    return <ChiefOfStaffSkeleton />;
  }

  // Error
  if (isError) {
    return (
      <EmptyState
        icon={Sparkles}
        title={t('chiefOfStaff.error', 'Unable to load intelligence')}
        description={t(
          'chiefOfStaff.errorDesc',
          'There was a problem loading the AI Chief of Staff. Please try again later.',
        )}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
      role="main"
      aria-label={t('chiefOfStaff.ariaLabel', 'AI Chief of Staff')}
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-3"
      >
        <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight">
            {t('chiefOfStaff.heading', 'AI Chief of Staff')}
          </h2>
          <p className="text-xs text-muted-foreground">
            {t('chiefOfStaff.subtitle', 'Your proactive hiring intelligence assistant')}
          </p>
        </div>
      </motion.div>

      {/* ── Threat Summary Strip ────────────────────────────────── */}
      <ThreatSummaryStrip threat={threatSummary} />

      {/* ── Main Content Grid ───────────────────────────────────── */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-5">
        {/* Left column: 60% -- Prioritized Actions */}
        <div className="lg:col-span-3">
          <PrioritizedActionList actions={prioritizedActions} />
        </div>

        {/* Right column: 40% -- Bottlenecks + Weekly Update */}
        <div className="lg:col-span-2 space-y-4">
          <BottleneckFlagPanel bottlenecks={bottlenecks} />
          <WeeklyUpdateGenerator weeklyUpdate={weeklyUpdate} />
        </div>
      </div>

      {/* ── Bottom: Proactive Insights Feed ─────────────────────── */}
      <ProactiveInsightsFeed insights={proactiveInsights} />
    </motion.div>
  );
}

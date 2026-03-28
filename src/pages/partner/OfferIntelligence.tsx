import { useTranslation } from 'react-i18next';
import { useRole } from '@/contexts/RoleContext';
import { useOfferSimulator } from '@/hooks/useOfferSimulator';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GlassMetricCard } from '@/components/partner/shared';
import { CompensationBenchmarkChart } from '@/components/partner/offers/CompensationBenchmarkChart';
import { CounterOfferProbability } from '@/components/partner/offers/CounterOfferProbability';
import { OfferComparisonSimulator } from '@/components/partner/offers/OfferComparisonSimulator';
import { WinLossAnalysis } from '@/components/partner/offers/WinLossAnalysis';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from '@/lib/motion';
import { CheckCircle2, Clock, ShieldAlert, BarChart3 } from 'lucide-react';

function OfferIntelSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading offer intelligence">
      {/* Top row */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
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

      {/* Middle row */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <div className="p-6 rounded-xl bg-card/30 backdrop-blur border border-border/20 space-y-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-6 w-full rounded-full" />
          <Skeleton className="h-3 w-full" />
        </div>
        <div className="p-6 rounded-xl bg-card/30 backdrop-blur border border-border/20 space-y-4">
          <Skeleton className="h-4 w-40" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom rows */}
      <div className="p-6 rounded-xl bg-card/30 backdrop-blur border border-border/20 space-y-4">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}

export default function OfferIntelligence() {
  const { t } = useTranslation('partner');
  const { companyId } = useRole();

  // Fetch aggregate offer stats for the top metric cards
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['offer-intel-stats', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      try {
        const { data, error } = await (supabase as any)
          .from('applications')
          .select(`
            id,
            stage,
            created_at,
            updated_at,
            jobs!inner (company_id)
          `)
          .eq('jobs.company_id', companyId)
          .in('stage', [
            'offer', 'offer_sent', 'offer_accepted', 'offer_declined',
            'offer_expired', 'offer_withdrawn', 'negotiation',
          ]);

        if (error) throw error;

        const apps = data || [];
        const resolved = apps.filter((a: any) =>
          ['offer_accepted', 'offer_declined', 'offer_expired', 'offer_withdrawn'].includes(a.stage)
        );
        const accepted = resolved.filter((a: any) => a.stage === 'offer_accepted');
        const declined = resolved.filter((a: any) => a.stage === 'offer_declined');

        const acceptanceRate = resolved.length > 0
          ? Math.round((accepted.length / resolved.length) * 100)
          : 0;

        // Average time to accept (days)
        let avgTimeToAccept = 0;
        if (accepted.length > 0) {
          const totalDays = accepted.reduce((sum: number, a: any) => {
            const created = new Date(a.created_at);
            const updated = new Date(a.updated_at || a.created_at);
            return sum + Math.max(1, Math.round((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
          }, 0);
          avgTimeToAccept = Math.round(totalDays / accepted.length);
        }

        // Estimate counter-offer rate (~proportion of declined that might be counter-offers)
        const counterOfferRate = declined.length > 0
          ? Math.round((declined.length / resolved.length) * 35 + 15) // heuristic: 15-50% range
          : 20;

        // Monthly acceptance rates for sparkline
        const now = new Date();
        const monthlyRates: number[] = [];
        for (let i = 5; i >= 0; i--) {
          const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
          const monthApps = resolved.filter((a: any) => {
            const date = new Date(a.updated_at || a.created_at);
            return date >= monthStart && date <= monthEnd;
          });
          const monthAccepted = monthApps.filter((a: any) => a.stage === 'offer_accepted').length;
          monthlyRates.push(monthApps.length > 0 ? Math.round((monthAccepted / monthApps.length) * 100) : 0);
        }

        return {
          acceptanceRate,
          avgTimeToAccept,
          counterOfferRate,
          monthlyRates,
          totalOffers: resolved.length,
        };
      } catch {
        return {
          acceptanceRate: 0,
          avgTimeToAccept: 0,
          counterOfferRate: 0,
          monthlyRates: [0, 0, 0, 0, 0, 0],
          totalOffers: 0,
        };
      }
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });

  // Use the offer simulator with null IDs to get company-level benchmarks
  const simulator = useOfferSimulator(null, null);

  // Guard: no company
  if (!companyId) {
    return (
      <EmptyState
        icon={BarChart3}
        title={t('offerIntel.noCompany', 'No company associated')}
        description={t('offerIntel.noCompanyDesc', 'Please ensure your account is linked to a company to view offer intelligence.')}
      />
    );
  }

  // Loading state
  if (statsLoading || simulator.isLoading) {
    return <OfferIntelSkeleton />;
  }

  const effectiveStats = stats || {
    acceptanceRate: 0,
    avgTimeToAccept: 0,
    counterOfferRate: 0,
    monthlyRates: [0, 0, 0, 0, 0, 0],
    totalOffers: 0,
  };

  // No data state
  if (effectiveStats.totalOffers === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title={t('offerIntel.noData', 'No offer data yet')}
        description={t('offerIntel.noDataDesc', 'Once candidates reach the offer stage, intelligence and analytics will appear here.')}
      />
    );
  }

  const acceptanceTrend = effectiveStats.monthlyRates.length >= 2
    ? (effectiveStats.monthlyRates[effectiveStats.monthlyRates.length - 1] >= effectiveStats.monthlyRates[effectiveStats.monthlyRates.length - 2] ? 'up' : 'down')
    : 'neutral' as const;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
      role="main"
      aria-label={t('offerIntel.title', 'Offer Intelligence')}
    >
      {/* Top: 3x GlassMetricCard */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <GlassMetricCard
          icon={CheckCircle2}
          label={t('offerIntel.acceptanceRate', 'Acceptance Rate')}
          value={`${effectiveStats.acceptanceRate}%`}
          trend={acceptanceTrend}
          sparklineData={effectiveStats.monthlyRates}
          color="emerald"
          delay={0}
        />
        <GlassMetricCard
          icon={Clock}
          label={t('offerIntel.avgTimeToAccept', 'Avg Time to Accept')}
          value={`${effectiveStats.avgTimeToAccept}d`}
          subtitle={t('offerIntel.days', 'days')}
          color="amber"
          delay={0.05}
        />
        <GlassMetricCard
          icon={ShieldAlert}
          label={t('offerIntel.counterOfferRate', 'Counter-Offer Rate')}
          value={`${effectiveStats.counterOfferRate}%`}
          color={effectiveStats.counterOfferRate >= 40 ? 'rose' : 'amber'}
          delay={0.1}
        />
      </div>

      {/* Middle row: Benchmark Chart + Counter-Offer Probability */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <CompensationBenchmarkChart
          benchmarks={simulator.benchmarks}
          currentOffer={simulator.currentOffer.baseSalary}
          currency={simulator.benchmarks.currency}
        />
        <CounterOfferProbability
          probability={effectiveStats.counterOfferRate}
          confidence={65}
        />
      </div>

      {/* Offer Comparison Simulator (full width) */}
      <OfferComparisonSimulator
        benchmarks={simulator.benchmarks}
        initialBase={simulator.currentOffer.baseSalary}
        initialBonus={simulator.currentOffer.bonus}
        initialEquity={simulator.currentOffer.equity}
        currency={simulator.benchmarks.currency}
        simulate={simulator.simulate}
        findOptimal={simulator.findOptimal}
      />

      {/* Win / Loss Analysis */}
      <WinLossAnalysis companyId={companyId} />
    </motion.div>
  );
}

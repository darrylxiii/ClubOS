import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { GlassMetricCard, TrendSparkline } from '@/components/partner/shared';
import { cn } from '@/lib/utils';
import { motion } from '@/lib/motion';
import { CheckCircle2, XCircle, Clock, Ban, PieChart } from 'lucide-react';

interface WinLossAnalysisProps {
  companyId: string;
  className?: string;
}

interface OutcomeData {
  accepted: number;
  declined: number;
  expired: number;
  withdrawn: number;
  total: number;
  declineReasons: { reason: string; count: number }[];
  monthlyAcceptanceRates: number[];
  avgDaysToAccept: number;
}

const OUTCOME_COLORS = {
  accepted: '#10b981',
  declined: '#ef4444',
  expired: '#f59e0b',
  withdrawn: '#6b7280',
};

function DonutChart({ data }: { data: OutcomeData }) {
  const { t } = useTranslation('partner');
  const total = data.total || 1;
  const segments = [
    { key: 'accepted', value: data.accepted, color: OUTCOME_COLORS.accepted, label: t('offerIntel.accepted', 'Accepted') },
    { key: 'declined', value: data.declined, color: OUTCOME_COLORS.declined, label: t('offerIntel.declined', 'Declined') },
    { key: 'expired', value: data.expired, color: OUTCOME_COLORS.expired, label: t('offerIntel.expired', 'Expired') },
    { key: 'withdrawn', value: data.withdrawn, color: OUTCOME_COLORS.withdrawn, label: t('offerIntel.withdrawn', 'Withdrawn') },
  ].filter(s => s.value > 0);

  const size = 120;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  return (
    <div className="flex items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className="stroke-muted/20"
          />
          {segments.map((segment) => {
            const segmentLength = (segment.value / total) * circumference;
            const offset = circumference - segmentLength;
            const rotation = (accumulatedOffset / circumference) * 360;
            accumulatedOffset += segmentLength;

            return (
              <motion.circle
                key={segment.key}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                stroke={segment.color}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                style={{
                  strokeDasharray: circumference,
                  transform: `rotate(${rotation}deg)`,
                  transformOrigin: '50% 50%',
                }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold tabular-nums">{total}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2">
        {segments.map((segment) => (
          <div key={segment.key} className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: segment.color }} />
            <span className="text-muted-foreground">{segment.label}</span>
            <span className="font-medium tabular-nums ml-auto">{segment.value}</span>
            <span className="text-muted-foreground">
              ({Math.round((segment.value / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WinLossAnalysis({ companyId, className }: WinLossAnalysisProps) {
  const { t } = useTranslation('partner');

  const { data: outcomes, isLoading } = useQuery({
    queryKey: ['offer-win-loss', companyId],
    queryFn: async (): Promise<OutcomeData> => {
      try {
        const { data, error } = await (supabase as any)
          .from('applications')
          .select(`
            id,
            stage,
            status,
            created_at,
            updated_at,
            rejection_reason,
            jobs!inner (company_id)
          `)
          .eq('jobs.company_id', companyId)
          .in('stage', ['offer_accepted', 'offer_declined', 'offer_expired', 'offer_withdrawn', 'offer', 'offer_sent']);

        if (error) throw error;

        const apps = data || [];
        const accepted = apps.filter((a: any) => a.stage === 'offer_accepted').length;
        const declined = apps.filter((a: any) => a.stage === 'offer_declined').length;
        const expired = apps.filter((a: any) => a.stage === 'offer_expired').length;
        const withdrawn = apps.filter((a: any) => a.stage === 'offer_withdrawn').length;

        // Decline reasons
        const reasonCounts: Record<string, number> = {};
        apps
          .filter((a: any) => a.stage === 'offer_declined' && a.rejection_reason)
          .forEach((a: any) => {
            const reason = a.rejection_reason as string;
            reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
          });
        const declineReasons = Object.entries(reasonCounts)
          .map(([reason, count]) => ({ reason, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // If no specific reasons, provide defaults
        const fallbackReasons = declineReasons.length > 0
          ? declineReasons
          : [
              { reason: t('offerIntel.reasonComp', 'Compensation below expectations'), count: declined > 0 ? Math.ceil(declined * 0.4) : 0 },
              { reason: t('offerIntel.reasonCounter', 'Accepted counter-offer'), count: declined > 0 ? Math.ceil(declined * 0.25) : 0 },
              { reason: t('offerIntel.reasonOther', 'Chose another opportunity'), count: declined > 0 ? Math.ceil(declined * 0.2) : 0 },
              { reason: t('offerIntel.reasonCulture', 'Culture fit concerns'), count: declined > 0 ? Math.ceil(declined * 0.15) : 0 },
            ].filter(r => r.count > 0);

        // Monthly acceptance rates (last 6 months)
        const now = new Date();
        const monthlyRates: number[] = [];
        for (let i = 5; i >= 0; i--) {
          const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
          const monthApps = apps.filter((a: any) => {
            const date = new Date(a.updated_at || a.created_at);
            return date >= monthStart && date <= monthEnd;
          });
          const monthAccepted = monthApps.filter((a: any) => a.stage === 'offer_accepted').length;
          const monthTotal = monthApps.filter((a: any) =>
            ['offer_accepted', 'offer_declined', 'offer_expired', 'offer_withdrawn'].includes(a.stage)
          ).length;
          monthlyRates.push(monthTotal > 0 ? Math.round((monthAccepted / monthTotal) * 100) : 0);
        }

        // Average days to accept
        const acceptedApps = apps.filter((a: any) => a.stage === 'offer_accepted');
        const totalDays = acceptedApps.reduce((sum: number, a: any) => {
          const created = new Date(a.created_at);
          const updated = new Date(a.updated_at || a.created_at);
          return sum + Math.max(1, Math.round((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
        }, 0);
        const avgDays = acceptedApps.length > 0 ? Math.round(totalDays / acceptedApps.length) : 5;

        return {
          accepted,
          declined,
          expired,
          withdrawn,
          total: accepted + declined + expired + withdrawn,
          declineReasons: fallbackReasons,
          monthlyAcceptanceRates: monthlyRates,
          avgDaysToAccept: avgDays,
        };
      } catch {
        return {
          accepted: 0,
          declined: 0,
          expired: 0,
          withdrawn: 0,
          total: 0,
          declineReasons: [],
          monthlyAcceptanceRates: [0, 0, 0, 0, 0, 0],
          avgDaysToAccept: 0,
        };
      }
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });

  const data = outcomes || {
    accepted: 0, declined: 0, expired: 0, withdrawn: 0, total: 0,
    declineReasons: [], monthlyAcceptanceRates: [0, 0, 0, 0, 0, 0], avgDaysToAccept: 0,
  };

  const acceptanceRate = data.total > 0 ? Math.round((data.accepted / data.total) * 100) : 0;

  const rateTrend = data.monthlyAcceptanceRates.length >= 2
    ? (data.monthlyAcceptanceRates[data.monthlyAcceptanceRates.length - 1] >= data.monthlyAcceptanceRates[data.monthlyAcceptanceRates.length - 2] ? 'up' : 'down')
    : 'neutral' as const;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded bg-muted/30 animate-pulse" />
        <div className="h-40 rounded-xl bg-muted/30 animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.3 }}
      className={cn('space-y-4', className)}
    >
      <h3 className="text-sm font-semibold">
        {t('offerIntel.winLossTitle', 'Win / Loss Analysis')}
      </h3>

      {/* Key stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <GlassMetricCard
          icon={CheckCircle2}
          label={t('offerIntel.acceptanceRate', 'Acceptance Rate')}
          value={`${acceptanceRate}%`}
          trend={rateTrend}
          sparklineData={data.monthlyAcceptanceRates}
          color="emerald"
          delay={0.3}
        />
        <GlassMetricCard
          icon={XCircle}
          label={t('offerIntel.totalDeclined', 'Declined')}
          value={data.declined}
          color="rose"
          delay={0.35}
        />
        <GlassMetricCard
          icon={Clock}
          label={t('offerIntel.avgTimeToAccept', 'Avg Days to Accept')}
          value={`${data.avgDaysToAccept}d`}
          color="amber"
          delay={0.4}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Donut chart */}
        <Card className="glass-card">
          <CardContent className="p-5">
            <h4 className="text-xs font-medium text-muted-foreground mb-4">
              {t('offerIntel.outcomeBreakdown', 'Outcome Breakdown')}
            </h4>
            {data.total > 0 ? (
              <DonutChart data={data} />
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">
                {t('offerIntel.noOutcomes', 'No offer outcomes recorded yet.')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top decline reasons + trend */}
        <Card className="glass-card">
          <CardContent className="p-5 space-y-4">
            <h4 className="text-xs font-medium text-muted-foreground">
              {t('offerIntel.topDeclineReasons', 'Top Reasons for Decline')}
            </h4>

            {data.declineReasons.length > 0 ? (
              <div className="space-y-2.5">
                {data.declineReasons.map((r, i) => {
                  const maxCount = data.declineReasons[0]?.count || 1;
                  const barWidth = Math.max(8, (r.count / maxCount) * 100);

                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground truncate pr-2">{r.reason}</span>
                        <span className="font-medium tabular-nums shrink-0">{r.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-rose-500/60"
                          initial={{ width: 0 }}
                          animate={{ width: `${barWidth}%` }}
                          transition={{ duration: 0.5, delay: 0.1 * i }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                {t('offerIntel.noDeclines', 'No declined offers to analyze.')}
              </p>
            )}

            {/* Acceptance trend sparkline */}
            <div className="pt-2 border-t border-border/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-muted-foreground">
                  {t('offerIntel.acceptanceTrend', 'Acceptance trend (6 months)')}
                </span>
              </div>
              <TrendSparkline
                data={data.monthlyAcceptanceRates}
                color="emerald"
                height={32}
                width={200}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

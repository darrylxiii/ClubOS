import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { Filter, TrendingDown } from 'lucide-react';
import { useCRMAnalytics } from '@/hooks/useCRMAnalytics';
import { formatCurrency } from '@/lib/revenueCalculations';

const STAGE_COLORS: Record<string, string> = {
  new: 'bg-gray-500',
  contacted: 'bg-blue-500',
  opened: 'bg-cyan-500',
  replied: 'bg-purple-500',
  qualified: 'bg-green-500',
  meeting_booked: 'bg-emerald-500',
  proposal_sent: 'bg-orange-500',
  negotiation: 'bg-amber-500',
  closed_won: 'bg-green-600',
  closed_lost: 'bg-red-500',
};

const STAGE_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  opened: 'Opened',
  replied: 'Replied',
  qualified: 'Qualified',
  meeting_booked: 'Meeting',
  proposal_sent: 'Proposal',
  negotiation: 'Negotiation',
  closed_won: 'Won',
  closed_lost: 'Lost',
};

interface CRMFunnelChartProps {
  dateRange?: 'week' | 'month' | '3months' | '6months' | 'year';
}

export function CRMFunnelChart({ dateRange = 'month' }: CRMFunnelChartProps) {
  const { data, loading } = useCRMAnalytics({ dateRange });

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const funnel = data?.funnel || [];
  const maxCount = Math.max(...funnel.map(f => f.count), 1);

  // Filter out closed_lost for main funnel, show separately
  const mainFunnel = funnel.filter(f => f.stage !== 'closed_lost').slice(0, 8);
  const lostStage = funnel.find(f => f.stage === 'closed_lost');

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Filter className="w-5 h-5 text-primary" />
          Sales Funnel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {mainFunnel.map((stage, index) => {
          const widthPercent = (stage.count / maxCount) * 100;
          return (
            <motion.div
              key={stage.stage}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative"
            >
              <div className="flex items-center gap-3">
                <div className="w-20 text-sm text-muted-foreground shrink-0">
                  {STAGE_LABELS[stage.stage] || stage.stage}
                </div>
                <div className="flex-1 relative h-8">
                  <div
                    className={`absolute inset-y-0 left-0 rounded ${STAGE_COLORS[stage.stage] || 'bg-gray-500'} opacity-80`}
                    style={{ width: `${Math.max(widthPercent, 3)}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-between px-3">
                    <span className="text-sm font-medium text-white mix-blend-difference">
                      {stage.count}
                    </span>
                    {stage.value > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(stage.value)}
                      </span>
                    )}
                  </div>
                </div>
                {index < mainFunnel.length - 1 && stage.conversionRate > 0 && (
                  <div className="w-12 text-right">
                    <span className="text-xs text-muted-foreground">
                      {stage.conversionRate.toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}

        {/* Lost deals section */}
        {lostStage && lostStage.count > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="pt-3 mt-3 border-t border-border/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-20 text-sm text-red-400 shrink-0 flex items-center gap-1">
                <TrendingDown className="w-3 h-3" />
                Lost
              </div>
              <div className="flex-1 relative h-8">
                <div
                  className="absolute inset-y-0 left-0 rounded bg-red-500/50"
                  style={{ width: `${Math.max((lostStage.count / maxCount) * 100, 3)}%` }}
                />
                <div className="absolute inset-0 flex items-center px-3">
                  <span className="text-sm font-medium text-red-300">
                    {lostStage.count}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

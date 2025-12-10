import { motion } from "framer-motion";
import { useCRMAnalytics } from "@/hooks/useCRMAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingDown, TrendingUp, DollarSign } from "lucide-react";

const STAGE_COLORS: Record<string, string> = {
  new: 'bg-blue-500',
  contacted: 'bg-cyan-500',
  opened: 'bg-teal-500',
  replied: 'bg-emerald-500',
  qualified: 'bg-green-500',
  meeting_booked: 'bg-amber-500',
  proposal_sent: 'bg-orange-500',
  negotiation: 'bg-rose-500',
  closed_won: 'bg-green-600',
  closed_lost: 'bg-red-500'
};

const STAGE_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  opened: 'Opened',
  replied: 'Replied',
  qualified: 'Qualified',
  meeting_booked: 'Meeting Booked',
  proposal_sent: 'Proposal Sent',
  negotiation: 'Negotiation',
  closed_won: 'Won',
  closed_lost: 'Lost'
};

interface CRMFunnelVisualizationProps {
  dateRange?: 'week' | 'month' | '3months' | '6months' | 'year';
}

export function CRMFunnelVisualization({ dateRange = 'month' }: CRMFunnelVisualizationProps) {
  const { data, loading } = useCRMAnalytics({ dateRange });

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Sales Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const funnel = data?.funnel.filter(s => s.stage !== 'closed_lost') || [];
  const closedLost = data?.funnel.find(s => s.stage === 'closed_lost');
  const maxCount = Math.max(...funnel.map(s => s.count), 1);

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-primary" />
          Sales Funnel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {funnel.map((stage, index) => {
          const widthPercent = (stage.count / maxCount) * 100;
          
          return (
            <motion.div
              key={stage.stage}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{STAGE_LABELS[stage.stage] || stage.stage}</span>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    €{(stage.value / 1000).toFixed(0)}k
                  </span>
                </div>
              </div>
              
              <div className="relative h-10 bg-muted/30 rounded-lg overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPercent}%` }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`h-full ${STAGE_COLORS[stage.stage] || 'bg-primary'} flex items-center justify-between px-3`}
                >
                  <span className="text-white font-semibold text-sm">
                    {stage.count}
                  </span>
                  {index > 0 && (
                    <span className="text-white/80 text-xs flex items-center gap-1">
                      {stage.conversionRate > 50 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {stage.conversionRate.toFixed(1)}%
                    </span>
                  )}
                </motion.div>
              </div>
            </motion.div>
          );
        })}

        {closedLost && closedLost.count > 0 && (
          <div className="pt-3 border-t border-border/50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-red-400 font-medium">Lost Deals</span>
              <span className="text-muted-foreground">
                {closedLost.count} prospects (€{(closedLost.value / 1000).toFixed(0)}k)
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

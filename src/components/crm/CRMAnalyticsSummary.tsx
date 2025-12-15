import { motion } from "framer-motion";
import { useCRMAnalytics } from "@/hooks/useCRMAnalytics";
import { useCRMPipelineMetrics, formatCurrencyCompact } from "@/hooks/useCRMPipelineMetrics";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Users, Euro, TrendingUp, Target, Scale, Briefcase } from "lucide-react";

interface CRMAnalyticsSummaryProps {
  dateRange?: 'week' | 'month' | '3months' | '6months' | 'year';
}

export function CRMAnalyticsSummary({ dateRange = 'month' }: CRMAnalyticsSummaryProps) {
  const { data, loading } = useCRMAnalytics({ dateRange });
  const { data: pipelineMetrics, isLoading: pipelineLoading } = useCRMPipelineMetrics();

  const stats = [
    {
      label: 'Total Prospects',
      value: pipelineMetrics?.prospect_count || data?.overview.totalProspects || 0,
      icon: Users,
      color: 'text-blue-400',
      format: (v: number) => v.toString(),
      tooltip: 'Active prospects in pipeline'
    },
    {
      label: 'Total Pipeline',
      value: pipelineMetrics?.total_pipeline || 0,
      icon: Briefcase,
      color: 'text-cyan-400',
      format: (v: number) => formatCurrencyCompact(v),
      tooltip: 'Sum of all estimated annual values'
    },
    {
      label: 'Weighted Pipeline',
      value: pipelineMetrics?.weighted_pipeline || 0,
      icon: Scale,
      color: 'text-purple-400',
      format: (v: number) => formatCurrencyCompact(v),
      tooltip: 'Expected value based on stage probabilities'
    },
    {
      label: 'Avg Deal Size',
      value: pipelineMetrics?.avg_deal_size || 0,
      icon: Euro,
      color: 'text-green-400',
      format: (v: number) => formatCurrencyCompact(v),
      tooltip: 'Average estimated annual value per prospect'
    },
    {
      label: 'Conversion Rate',
      value: data?.overview.conversionRate || 0,
      icon: TrendingUp,
      color: 'text-amber-400',
      format: (v: number) => `${v.toFixed(1)}%`,
      tooltip: 'Percentage of prospects that convert to clients'
    },
    {
      label: 'Deals Won',
      value: data?.overview.dealsWon || 0,
      icon: Target,
      color: 'text-emerald-400',
      format: (v: number) => v.toString(),
      tooltip: 'Total closed won deals'
    }
  ];

  const isLoading = loading || pipelineLoading;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50 hover:border-border transition-colors cursor-default">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                        <p className="text-xl font-bold">{stat.format(stat.value)}</p>
                      </div>
                      <div className={`p-2 rounded-lg bg-muted/30 ${stat.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">{stat.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </motion.div>
        );
      })}
    </div>
  );
}

import { useTranslation } from 'react-i18next';
import { motion } from '@/lib/motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Trophy } from 'lucide-react';
import { useAnonymizedBenchmarks, type BenchmarkMetric } from '@/hooks/useAnonymizedBenchmarks';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function percentileColor(percentile: number) {
  if (percentile >= 60) return 'emerald';
  if (percentile >= 40) return 'amber';
  return 'rose';
}

function PercentileBadge({ percentile }: { percentile: number }) {
  const color = percentileColor(percentile);
  const styles = {
    emerald: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    amber: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    rose: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
  };
  return (
    <Badge variant="outline" className={cn('text-xs tabular-nums', styles[color])}>
      {percentile}th
    </Badge>
  );
}

function MetricRow({ metric, index }: { metric: BenchmarkMetric; index: number }) {
  const color = percentileColor(metric.percentile);
  const barColor = {
    emerald: '[&>div]:bg-emerald-500',
    amber: '[&>div]:bg-amber-500',
    rose: '[&>div]:bg-rose-500',
  }[color];

  const formatValue = (v: number | null, unit: string) => {
    if (v == null) return '--';
    const rounded = Math.round(v * 10) / 10;
    return unit === '%' ? `${rounded}%` : `${rounded}${unit ? ` ${unit}` : ''}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.25 }}
      className="p-4 rounded-lg bg-card/20 border border-border/10 space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{metric.label}</span>
        <PercentileBadge percentile={metric.percentile} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
        <div>
          <span className="block font-semibold text-foreground text-sm tabular-nums">
            {formatValue(metric.yours, metric.unit)}
          </span>
          You
        </div>
        <div>
          <span className="block font-semibold text-foreground text-sm tabular-nums">
            {formatValue(metric.networkAvg, metric.unit)}
          </span>
          Network avg
        </div>
        <div>
          <span className="block font-semibold text-foreground text-sm tabular-nums">
            {metric.percentile}th
          </span>
          Percentile
        </div>
      </div>

      <Progress value={metric.percentile} className={cn('h-2', barColor)} />
    </motion.div>
  );
}

export function AnonymizedBenchmarks() {
  const { t } = useTranslation('partner');
  const { data, isLoading } = useAnonymizedBenchmarks();

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-primary" />
            {t('networkIntelligence.benchmarks.title', 'Your Metrics vs Network')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const hasData = data.metrics.some(m => m.yours != null);

  return (
    <Card className="glass-card group hover:border-primary/30 transition-all duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            {t('networkIntelligence.benchmarks.title', 'Your Metrics vs Network')}
          </div>
          {data.overallPercentile >= 75 && (
            <Badge variant="outline" className="gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
              <Trophy className="h-3 w-3" />
              {t('networkIntelligence.benchmarks.topPerformer', 'Top Performer')}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasData ? (
          <div className="text-center py-8 space-y-2">
            <BarChart3 className="h-8 w-8 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {t('networkIntelligence.benchmarks.noData', 'Complete more hiring cycles to unlock network benchmarks.')}
            </p>
          </div>
        ) : (
          data.metrics.map((metric, i) => (
            <MetricRow key={metric.key} metric={metric} index={i} />
          ))
        )}
      </CardContent>
    </Card>
  );
}

import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { motion } from '@/lib/motion';
import type { OfferBenchmarks } from '@/hooks/useOfferSimulator';

interface CompensationBenchmarkChartProps {
  benchmarks: OfferBenchmarks;
  currentOffer: number;
  currency?: string;
  className?: string;
}

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function getPercentile(value: number, benchmarks: OfferBenchmarks): number {
  if (value <= benchmarks.min) return 0;
  if (value >= benchmarks.max) return 100;
  if (value <= benchmarks.p25) {
    return 25 * ((value - benchmarks.min) / (benchmarks.p25 - benchmarks.min));
  }
  if (value <= benchmarks.p50) {
    return 25 + 25 * ((value - benchmarks.p25) / (benchmarks.p50 - benchmarks.p25));
  }
  if (value <= benchmarks.p75) {
    return 50 + 25 * ((value - benchmarks.p50) / (benchmarks.p75 - benchmarks.p50));
  }
  return 75 + 25 * ((value - benchmarks.p75) / (benchmarks.max - benchmarks.p75));
}

export function CompensationBenchmarkChart({
  benchmarks,
  currentOffer,
  currency = 'USD',
  className,
}: CompensationBenchmarkChartProps) {
  const { t } = useTranslation('partner');

  const percentile = Math.round(getPercentile(currentOffer, benchmarks));
  const markerPosition = Math.max(2, Math.min(98, percentile));

  const colorClass =
    percentile >= 50
      ? 'text-emerald-500'
      : percentile >= 25
      ? 'text-amber-500'
      : 'text-rose-500';

  const barColorClass =
    percentile >= 50
      ? 'bg-emerald-500'
      : percentile >= 25
      ? 'bg-amber-500'
      : 'bg-rose-500';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.3 }}
    >
      <Card className={cn('glass-card', className)}>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              {t('offerIntel.benchmarkTitle', 'Compensation Benchmark')}
            </h3>
            <span className={cn('text-xs font-medium', colorClass)}>
              {t('offerIntel.percentileLabel', '{{percentile}}th percentile', { percentile })}
            </span>
          </div>

          {/* Range bar */}
          <div className="space-y-2">
            <div className="relative h-6 rounded-full bg-muted/40 overflow-hidden">
              {/* P25 zone */}
              <div
                className="absolute inset-y-0 left-0 bg-rose-500/20 rounded-l-full"
                style={{ width: '25%' }}
              />
              {/* P25–P50 zone */}
              <div
                className="absolute inset-y-0 bg-amber-500/20"
                style={{ left: '25%', width: '25%' }}
              />
              {/* P50–P75 zone */}
              <div
                className="absolute inset-y-0 bg-emerald-500/15"
                style={{ left: '50%', width: '25%' }}
              />
              {/* P75+ zone */}
              <div
                className="absolute inset-y-0 bg-emerald-500/25 rounded-r-full"
                style={{ left: '75%', width: '25%' }}
              />

              {/* Offer marker */}
              <motion.div
                initial={{ left: '0%' }}
                animate={{ left: `${markerPosition}%` }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="absolute top-0 bottom-0 flex items-center"
                style={{ transform: 'translateX(-50%)' }}
              >
                <div className={cn('w-3 h-6 rounded-sm shadow-lg', barColorClass)} />
              </motion.div>
            </div>

            {/* Labels below the bar */}
            <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
              <span>{formatCurrency(benchmarks.min, currency)}</span>
              <span>P25: {formatCurrency(benchmarks.p25, currency)}</span>
              <span>P50: {formatCurrency(benchmarks.p50, currency)}</span>
              <span>P75: {formatCurrency(benchmarks.p75, currency)}</span>
              <span>{formatCurrency(benchmarks.max, currency)}</span>
            </div>
          </div>

          {/* Current offer highlight */}
          <div className="flex items-center justify-between text-xs bg-muted/30 rounded-lg p-3">
            <span className="text-muted-foreground">
              {t('offerIntel.yourOffer', 'Your Offer')}
            </span>
            <span className={cn('font-semibold tabular-nums', colorClass)}>
              {formatCurrency(currentOffer, currency)}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

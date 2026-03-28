import { useTranslation } from 'react-i18next';
import { motion } from '@/lib/motion';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { TrendSparkline } from '@/components/partner/shared';
import { cn } from '@/lib/utils';

interface ROIPerPlacementProps {
  avgROI: number;
  monthlyROI: number[];
  totalFees: number;
  avgFeePerHire: number;
  isLoading?: boolean;
}

export function ROIPerPlacement({
  avgROI,
  monthlyROI,
  totalFees,
  avgFeePerHire,
  isLoading,
}: ROIPerPlacementProps) {
  const { t } = useTranslation('partner');

  // Determine trend
  const hasTrend = monthlyROI.length >= 2;
  const nonZeroROIs = monthlyROI.filter(v => v > 0);
  const trendUp = hasTrend && nonZeroROIs.length >= 2
    ? nonZeroROIs[nonZeroROIs.length - 1] >= nonZeroROIs[nonZeroROIs.length - 2]
    : true;

  if (isLoading) {
    return (
      <div className="p-6 rounded-xl bg-card/30 backdrop-blur border border-border/20 animate-pulse">
        <div className="h-4 w-32 bg-muted rounded mb-4" />
        <div className="h-10 w-20 bg-muted rounded mb-2" />
        <div className="h-8 w-full bg-muted rounded mb-4" />
        <div className="h-3 w-48 bg-muted rounded" />
      </div>
    );
  }

  const formattedFees = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="p-6 rounded-xl bg-card/30 backdrop-blur border border-border/20 hover:border-primary/20 transition-colors duration-200"
      role="region"
      aria-label={t('successMetrics.roiPerPlacement', 'ROI Per Placement')}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
            <DollarSign className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-medium text-muted-foreground">
            {t('successMetrics.roiPerPlacement', 'ROI Per Placement')}
          </h3>
        </div>
        {hasTrend && (
          <span className={cn('flex items-center gap-1 text-xs font-medium', trendUp ? 'text-emerald-500' : 'text-rose-500')}>
            {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          </span>
        )}
      </div>

      {/* Big ROI number */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-4xl font-bold tabular-nums">{avgROI > 0 ? `${avgROI}x` : '--'}</span>
        <span className="text-sm text-muted-foreground">
          {t('successMetrics.returnMultiple', 'return')}
        </span>
      </div>

      {/* Value proposition */}
      {avgROI > 0 && (
        <p className="text-sm text-muted-foreground mb-4">
          {t('successMetrics.roiExplanation', 'Every $1 spent returns ${{amount}} in hire value.', {
            amount: avgROI.toFixed(1),
          })}
        </p>
      )}

      {/* Sparkline */}
      {monthlyROI.length >= 2 && (
        <div className="mb-4">
          <TrendSparkline
            data={monthlyROI}
            color="amber"
            height={36}
            width={200}
            showArea
            showEndDot
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            {t('successMetrics.last6Months', 'Last 6 months')}
          </p>
        </div>
      )}

      {/* Fee summary */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/10">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {t('successMetrics.totalFees', 'Total Fees')}
          </p>
          <p className="text-sm font-semibold tabular-nums">{formattedFees.format(totalFees)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {t('successMetrics.avgPerHire', 'Avg Per Hire')}
          </p>
          <p className="text-sm font-semibold tabular-nums">{formattedFees.format(avgFeePerHire)}</p>
        </div>
      </div>
    </motion.div>
  );
}

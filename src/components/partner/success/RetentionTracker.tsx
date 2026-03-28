import { useTranslation } from 'react-i18next';
import { motion } from '@/lib/motion';
import { Progress } from '@/components/ui/progress';
import { Shield, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RetentionTrackerProps {
  retentionRate: number; // 0-100
  monthlyRetention: number[];
  isLoading?: boolean;
}

function getRetentionColor(rate: number) {
  if (rate >= 90) return { text: 'text-emerald-500', bg: 'bg-emerald-500', label: 'excellent' };
  if (rate >= 70) return { text: 'text-amber-500', bg: 'bg-amber-500', label: 'good' };
  return { text: 'text-rose-500', bg: 'bg-rose-500', label: 'needsAttention' };
}

export function RetentionTracker({ retentionRate, monthlyRetention, isLoading }: RetentionTrackerProps) {
  const { t } = useTranslation('partner');
  const color = getRetentionColor(retentionRate);

  // Determine trend from monthly data
  const hasTrend = monthlyRetention.length >= 2;
  const trendUp = hasTrend
    ? monthlyRetention[monthlyRetention.length - 1] >= monthlyRetention[monthlyRetention.length - 2]
    : true;

  if (isLoading) {
    return (
      <div className="p-6 rounded-xl bg-card/30 backdrop-blur border border-border/20 animate-pulse">
        <div className="h-4 w-32 bg-muted rounded mb-4" />
        <div className="h-12 w-24 bg-muted rounded mb-4" />
        <div className="h-3 w-full bg-muted rounded" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="p-6 rounded-xl bg-card/30 backdrop-blur border border-border/20 hover:border-primary/20 transition-colors duration-200"
      role="region"
      aria-label={t('successMetrics.retentionTracker', '90-Day Retention Tracker')}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
            <Shield className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-medium text-muted-foreground">
            {t('successMetrics.retention90d', '90-Day Retention')}
          </h3>
        </div>
        {hasTrend && (
          <span className={cn('flex items-center gap-1 text-xs font-medium', trendUp ? 'text-emerald-500' : 'text-rose-500')}>
            {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trendUp
              ? t('successMetrics.improving', 'Improving')
              : t('successMetrics.declining', 'Declining')}
          </span>
        )}
      </div>

      {/* Big number */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className={cn('text-4xl font-bold tabular-nums', color.text)} aria-live="polite">
          {retentionRate}%
        </span>
        <span className="text-sm text-muted-foreground">
          {t(`successMetrics.${color.label}`, color.label)}
        </span>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        {t('successMetrics.retentionDesc', 'Percentage of hires still employed after 90 days')}
      </p>

      {/* Progress bar */}
      <div className="space-y-2">
        <Progress
          value={retentionRate}
          className="h-2.5"
          aria-valuenow={retentionRate}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('successMetrics.retentionProgress', 'Retention rate progress')}
          style={{
            // Override indicator color based on retention level
            ['--progress-color' as string]: color.bg,
          }}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>0%</span>
          <span className="text-emerald-500/50">
            {t('successMetrics.target', 'Target')}: 90%
          </span>
          <span>100%</span>
        </div>
      </div>
    </motion.div>
  );
}

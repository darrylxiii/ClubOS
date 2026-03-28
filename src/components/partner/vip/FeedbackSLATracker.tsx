import { useTranslation } from 'react-i18next';
import { motion } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendSparkline } from '@/components/partner/shared';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface FeedbackSLATrackerProps {
  /** Percentage of candidates who received feedback within 24h */
  complianceRate: number;
  /** Weekly compliance percentages (8 data points) */
  weeklyTrend: number[];
  /** Count of candidates past SLA still waiting */
  candidatesWaiting: number;
  className?: string;
}

function getComplianceColor(rate: number): {
  progressClass: string;
  textClass: string;
  sparklineColor: 'emerald' | 'amber' | 'rose';
  icon: typeof CheckCircle2;
} {
  if (rate >= 90) return {
    progressClass: '[&>div]:bg-emerald-500',
    textClass: 'text-emerald-500',
    sparklineColor: 'emerald',
    icon: CheckCircle2,
  };
  if (rate >= 70) return {
    progressClass: '[&>div]:bg-amber-500',
    textClass: 'text-amber-500',
    sparklineColor: 'amber',
    icon: AlertTriangle,
  };
  return {
    progressClass: '[&>div]:bg-rose-500',
    textClass: 'text-rose-500',
    sparklineColor: 'rose',
    icon: AlertTriangle,
  };
}

export function FeedbackSLATracker({
  complianceRate,
  weeklyTrend,
  candidatesWaiting,
  className,
}: FeedbackSLATrackerProps) {
  const { t } = useTranslation('partner');
  const config = getComplianceColor(complianceRate);
  const ComplianceIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'glass-card rounded-xl border border-border/20 p-5 space-y-4',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-semibold">
            {t('vip.feedbackSLA.title', 'Feedback SLA Compliance')}
          </span>
        </div>
        {candidatesWaiting > 0 && (
          <Badge variant="destructive" className="text-xs flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {candidatesWaiting} {t('vip.feedbackSLA.waiting', 'waiting')}
          </Badge>
        )}
      </div>

      {/* Big percentage */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-2">
            <span className={cn('text-4xl font-bold tabular-nums', config.textClass)}>
              {complianceRate}%
            </span>
            <ComplianceIcon className={cn('h-5 w-5', config.textClass)} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t(
              'vip.feedbackSLA.description',
              'of candidates got feedback within 24h',
            )}
          </p>
        </div>

        {/* Weekly sparkline */}
        {weeklyTrend.length >= 2 && (
          <div className="w-24 shrink-0">
            <TrendSparkline
              data={weeklyTrend}
              color={config.sparklineColor}
              height={32}
              width={96}
            />
            <p className="text-[10px] text-muted-foreground text-center mt-1">
              {t('vip.feedbackSLA.weeklyTrend', '8-week trend')}
            </p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <Progress
        value={complianceRate}
        className={cn('h-2', config.progressClass)}
      />
    </motion.div>
  );
}

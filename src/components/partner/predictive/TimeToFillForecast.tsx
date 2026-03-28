import { useTranslation } from 'react-i18next';
import { motion } from '@/lib/motion';
import { ConfidenceBadge, TrendSparkline } from '@/components/partner/shared';
import { Clock, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimeToFillPrediction } from '@/hooks/usePredictiveHiring';

interface TimeToFillForecastProps {
  predictions: TimeToFillPrediction[];
  trendData: number[];
}

const STATUS_CONFIG = {
  'on-track': {
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  behind: {
    icon: AlertTriangle,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  critical: {
    icon: XCircle,
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
  },
} as const;

export function TimeToFillForecast({ predictions, trendData }: TimeToFillForecastProps) {
  const { t } = useTranslation('partner');

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="p-5 rounded-xl bg-card/30 backdrop-blur border border-border/20"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
          <Clock className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-semibold">
          {t('predictive.timeToFillForecast', 'Time-to-Fill Forecast')}
        </h3>
      </div>

      {predictions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t('predictive.noOpenRoles', 'No open roles to forecast.')}
        </p>
      ) : (
        <div className="space-y-2">
          {/* Column headers */}
          <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-3 pb-1 border-b border-border/10">
            <span className="col-span-4">{t('predictive.role', 'Role')}</span>
            <span className="col-span-2 text-right">{t('predictive.predicted', 'Predicted')}</span>
            <span className="col-span-2 text-right">{t('predictive.current', 'Current')}</span>
            <span className="col-span-2 text-center">{t('predictive.status', 'Status')}</span>
            <span className="col-span-2 text-right">{t('predictive.confidence', 'Conf.')}</span>
          </div>

          {predictions.map((pred, idx) => {
            const statusCfg = STATUS_CONFIG[pred.status];
            const StatusIcon = statusCfg.icon;

            return (
              <motion.div
                key={pred.jobId}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + idx * 0.04, duration: 0.25 }}
                className={cn(
                  'grid grid-cols-12 gap-2 items-center py-2 px-3 rounded-lg',
                  'hover:bg-muted/30 transition-colors',
                  statusCfg.border,
                  'border-l-2'
                )}
              >
                <span className="col-span-4 text-sm font-medium truncate" title={pred.title}>
                  {pred.title}
                </span>
                <span className="col-span-2 text-sm tabular-nums text-right">
                  {pred.predictedDays}{t('predictive.daysShort', 'd')}
                </span>
                <span className="col-span-2 text-sm tabular-nums text-right text-muted-foreground">
                  {pred.currentDaysOpen}{t('predictive.daysShort', 'd')}
                </span>
                <div className="col-span-2 flex justify-center">
                  <span className={cn('flex items-center gap-1 text-xs font-medium', statusCfg.color)}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">
                      {t(`predictive.${pred.status}`, pred.status)}
                    </span>
                  </span>
                </div>
                <div className="col-span-2 flex justify-end">
                  <ConfidenceBadge score={pred.confidence} />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Overall TTF trend */}
      {trendData.length >= 2 && (
        <div className="mt-4 pt-4 border-t border-border/20">
          <p className="text-xs text-muted-foreground mb-2">
            {t('predictive.ttfTrend', 'Average time-to-fill trend (6 months)')}
          </p>
          <TrendSparkline
            data={trendData}
            color="amber"
            height={28}
            width={200}
            showArea
          />
        </div>
      )}
    </motion.div>
  );
}

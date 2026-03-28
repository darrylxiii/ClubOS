import { useTranslation } from 'react-i18next';
import { motion } from '@/lib/motion';
import { GlassMetricCard, ConfidenceBadge, TrendSparkline } from '@/components/partner/shared';
import { Users, TrendingUp } from 'lucide-react';
import type { WorkforcePlan } from '@/hooks/usePredictiveHiring';

interface WorkforcePlanningWidgetProps {
  plan: WorkforcePlan;
}

export function WorkforcePlanningWidget({ plan }: WorkforcePlanningWidgetProps) {
  const { t } = useTranslation('partner');

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-4"
    >
      {/* Header card: total projected hires */}
      <GlassMetricCard
        icon={Users}
        label={t('predictive.totalProjectedHires', 'Total Projected Hires This Year')}
        value={plan.totalProjectedHires}
        trend={plan.quarterlyTrend.length >= 2
          ? plan.quarterlyTrend[plan.quarterlyTrend.length - 1] >= plan.quarterlyTrend[plan.quarterlyTrend.length - 2]
            ? 'up' : 'down'
          : 'neutral'}
        sparklineData={plan.quarterlyTrend}
        color="primary"
      />

      {/* Forecast list */}
      <div className="p-5 rounded-xl bg-card/30 backdrop-blur border border-border/20">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <TrendingUp className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold">
            {t('predictive.workforceForecast', 'Based on your 18-month trend, you\'ll likely need:')}
          </h3>
        </div>

        {plan.forecasts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('predictive.noForecastData', 'Not enough historical data to generate forecasts yet.')}
          </p>
        ) : (
          <div className="space-y-3">
            {plan.forecasts.map((forecast, idx) => (
              <motion.div
                key={forecast.category}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + idx * 0.05, duration: 0.3 }}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl font-bold tabular-nums text-primary">
                    {forecast.predictedCount}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{forecast.category}</p>
                    <p className="text-xs text-muted-foreground">{forecast.quarter}</p>
                  </div>
                </div>
                <ConfidenceBadge score={forecast.confidence} />
              </motion.div>
            ))}
          </div>
        )}

        {/* Quarterly trend sparkline */}
        {plan.quarterlyTrend.length >= 2 && (
          <div className="mt-4 pt-4 border-t border-border/20">
            <p className="text-xs text-muted-foreground mb-2">
              {t('predictive.quarterlyHiringTrend', 'Quarterly hiring trend')}
            </p>
            <TrendSparkline
              data={plan.quarterlyTrend}
              color="primary"
              height={32}
              width={200}
              showArea
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

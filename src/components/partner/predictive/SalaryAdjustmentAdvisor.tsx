import { useTranslation } from 'react-i18next';
import { motion } from '@/lib/motion';
import { ConfidenceBadge } from '@/components/partner/shared';
import { DollarSign, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SalaryInsight } from '@/hooks/usePredictiveHiring';

interface SalaryAdjustmentAdvisorProps {
  insights: SalaryInsight[];
}

function formatCurrency(amount: number): string {
  if (amount >= 1000) {
    return `$${Math.round(amount / 1000)}k`;
  }
  return `$${amount.toLocaleString()}`;
}

/** Visual probability bar showing current vs recommended acceptance probability */
function ProbabilitySlider({
  current,
  recommended,
}: {
  current: number;
  recommended: number;
}) {
  return (
    <div className="relative w-full h-3 rounded-full bg-muted/50 overflow-hidden">
      {/* Recommended (wider, lighter) */}
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-emerald-500/25 transition-all duration-500"
        style={{ width: `${recommended}%` }}
      />
      {/* Current (narrower, solid) */}
      <div
        className={cn(
          'absolute inset-y-0 left-0 rounded-full transition-all duration-500',
          current >= 75 ? 'bg-emerald-500' : current >= 50 ? 'bg-amber-500' : 'bg-rose-500'
        )}
        style={{ width: `${current}%` }}
      />
      {/* Marker for recommended */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-emerald-400"
        style={{ left: `${recommended}%` }}
      />
    </div>
  );
}

export function SalaryAdjustmentAdvisor({ insights }: SalaryAdjustmentAdvisorProps) {
  const { t } = useTranslation('partner');

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="p-5 rounded-xl bg-card/30 backdrop-blur border border-border/20"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
          <DollarSign className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-semibold">
          {t('predictive.salaryAdvisor', 'Salary Adjustment Advisor')}
        </h3>
      </div>

      {insights.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t(
            'predictive.noSalaryInsights',
            'All current offers have strong acceptance probability, or no salary data available.'
          )}
        </p>
      ) : (
        <div className="space-y-4">
          {insights.map((insight, idx) => (
            <motion.div
              key={insight.jobId}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + idx * 0.05, duration: 0.25 }}
              className="p-3 rounded-lg bg-muted/20 border border-border/10 space-y-3"
            >
              {/* Role title + confidence */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium truncate" title={insight.title}>
                  {insight.title}
                </span>
                <ConfidenceBadge score={insight.confidence} />
              </div>

              {/* Insight text */}
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('predictive.salaryInsightText', 'Increasing offer by {{percent}}% would raise acceptance probability from {{current}}% to {{recommended}}%.', {
                  percent: insight.increasePercent,
                  current: insight.currentAcceptanceProbability,
                  recommended: insight.recommendedAcceptanceProbability,
                })}
              </p>

              {/* Salary comparison */}
              <div className="flex items-center gap-2 text-sm">
                <span className="tabular-nums text-muted-foreground">
                  {formatCurrency(insight.currentOffer)}
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="tabular-nums font-semibold text-emerald-500">
                  {formatCurrency(insight.recommendedOffer)}
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  (+{insight.increasePercent}%)
                </span>
              </div>

              {/* Visual probability slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{t('predictive.acceptanceProbability', 'Acceptance probability')}</span>
                  <span>
                    {insight.currentAcceptanceProbability}% → {insight.recommendedAcceptanceProbability}%
                  </span>
                </div>
                <ProbabilitySlider
                  current={insight.currentAcceptanceProbability}
                  recommended={insight.recommendedAcceptanceProbability}
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

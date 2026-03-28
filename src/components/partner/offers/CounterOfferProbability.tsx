import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { ConfidenceBadge } from '@/components/partner/shared';
import { cn } from '@/lib/utils';
import { motion } from '@/lib/motion';
import { ShieldAlert, TrendingUp, Clock, BarChart3 } from 'lucide-react';

interface CounterOfferProbabilityProps {
  probability: number;       // 0–100
  seniorityLevel?: string;   // e.g. "Senior", "Director"
  tenureYears?: number;      // years at current company
  industryDemand?: 'low' | 'medium' | 'high';
  confidence?: number;       // 0–100 confidence in this prediction
  className?: string;
}

function RadialIndicator({ value, size = 80 }: { value: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  const color =
    value >= 70 ? 'text-rose-500 stroke-rose-500'
    : value >= 40 ? 'text-amber-500 stroke-amber-500'
    : 'text-emerald-500 stroke-emerald-500';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={4}
          className="stroke-muted/30"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={4}
          strokeLinecap="round"
          className={color}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <span className={cn('absolute text-lg font-bold tabular-nums', color.split(' ')[0])}>
        {value}%
      </span>
    </div>
  );
}

const FACTOR_ICONS = {
  seniority: TrendingUp,
  tenure: Clock,
  demand: BarChart3,
} as const;

export function CounterOfferProbability({
  probability,
  seniorityLevel = 'Mid-Level',
  tenureYears = 3,
  industryDemand = 'medium',
  confidence = 72,
  className,
}: CounterOfferProbabilityProps) {
  const { t } = useTranslation('partner');

  const demandLabel = {
    low: t('offerIntel.demandLow', 'Low'),
    medium: t('offerIntel.demandMedium', 'Medium'),
    high: t('offerIntel.demandHigh', 'High'),
  }[industryDemand];

  const factors = [
    {
      key: 'seniority' as const,
      label: t('offerIntel.factorSeniority', 'Seniority'),
      value: seniorityLevel,
      impact: seniorityLevel === 'Director' || seniorityLevel === 'VP' ? 'high' : seniorityLevel === 'Senior' ? 'medium' : 'low',
    },
    {
      key: 'tenure' as const,
      label: t('offerIntel.factorTenure', 'Tenure'),
      value: t('offerIntel.tenureYears', '{{count}} years', { count: tenureYears }),
      impact: tenureYears >= 5 ? 'high' : tenureYears >= 2 ? 'medium' : 'low',
    },
    {
      key: 'demand' as const,
      label: t('offerIntel.factorDemand', 'Industry Demand'),
      value: demandLabel,
      impact: industryDemand,
    },
  ];

  const bufferMin = probability >= 60 ? 10 : probability >= 40 ? 7 : 5;
  const bufferMax = probability >= 60 ? 15 : probability >= 40 ? 10 : 8;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.3 }}
    >
      <Card className={cn('glass-card', className)}>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">
                {t('offerIntel.counterOfferTitle', 'Counter-Offer Likelihood')}
              </h3>
            </div>
            <ConfidenceBadge score={confidence} />
          </div>

          <div className="flex items-center gap-5">
            <RadialIndicator value={probability} />

            <div className="flex-1 space-y-2">
              {factors.map((factor) => {
                const Icon = FACTOR_ICONS[factor.key];
                const impactColor =
                  factor.impact === 'high'
                    ? 'text-rose-500'
                    : factor.impact === 'medium'
                    ? 'text-amber-500'
                    : 'text-emerald-500';

                return (
                  <div key={factor.key} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Icon className="h-3 w-3" />
                      {factor.label}
                    </span>
                    <span className={cn('font-medium', impactColor)}>{factor.value}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recommended buffer */}
          <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
            <p className="text-xs text-muted-foreground">
              {t('offerIntel.bufferAdvice', 'Recommended buffer: +{{min}}--{{max}}% above target to counter retention offers', {
                min: bufferMin,
                max: bufferMax,
              })}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

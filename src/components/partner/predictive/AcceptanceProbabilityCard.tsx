import { useTranslation } from 'react-i18next';
import { motion } from '@/lib/motion';
import { ConfidenceBadge } from '@/components/partner/shared';
import { cn } from '@/lib/utils';

interface Factor {
  label: string;
  impact: 'positive' | 'neutral' | 'negative';
  value: string;
}

interface AcceptanceProbabilityCardProps {
  probability: number;
  confidence?: number;
  factors?: Factor[];
  className?: string;
}

/** Radial gauge showing acceptance probability */
function RadialGauge({ value }: { value: number }) {
  const clampedValue = Math.max(0, Math.min(100, value));
  // SVG arc: 270 degrees total, starting from bottom-left
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const arcFraction = 0.75; // 270 degrees
  const arcLength = circumference * arcFraction;
  const filledLength = arcLength * (clampedValue / 100);

  // Color based on value
  const colorClass =
    clampedValue >= 75
      ? 'stroke-emerald-500'
      : clampedValue >= 50
        ? 'stroke-amber-500'
        : 'stroke-rose-500';

  const bgColorClass =
    clampedValue >= 75
      ? 'stroke-emerald-500/15'
      : clampedValue >= 50
        ? 'stroke-amber-500/15'
        : 'stroke-rose-500/15';

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg
        viewBox="0 0 120 120"
        className="w-full h-full -rotate-[135deg]"
        aria-hidden="true"
      >
        {/* Background arc */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          className={bgColorClass}
          strokeDasharray={`${arcLength} ${circumference}`}
        />
        {/* Filled arc */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          className={cn(colorClass, 'transition-all duration-700 ease-out')}
          strokeDasharray={`${filledLength} ${circumference}`}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums">{clampedValue}%</span>
      </div>
    </div>
  );
}

const IMPACT_STYLES = {
  positive: 'text-emerald-500 bg-emerald-500/10',
  neutral: 'text-muted-foreground bg-muted/50',
  negative: 'text-rose-500 bg-rose-500/10',
} as const;

export function AcceptanceProbabilityCard({
  probability,
  confidence = 65,
  factors = [],
  className,
}: AcceptanceProbabilityCardProps) {
  const { t } = useTranslation('partner');

  // Default factors if none provided
  const displayFactors: Factor[] = factors.length > 0
    ? factors
    : [
        {
          label: t('predictive.factorComp', 'Compensation'),
          impact: probability >= 70 ? 'positive' : 'negative',
          value: probability >= 70
            ? t('predictive.competitive', 'Competitive')
            : t('predictive.belowMarket', 'Below market'),
        },
        {
          label: t('predictive.factorBrand', 'Company brand'),
          impact: 'positive',
          value: t('predictive.strong', 'Strong'),
        },
        {
          label: t('predictive.factorSeniority', 'Role seniority'),
          impact: 'neutral',
          value: t('predictive.moderate', 'Moderate'),
        },
        {
          label: t('predictive.factorEngagement', 'Candidate engagement'),
          impact: probability >= 60 ? 'positive' : 'neutral',
          value: probability >= 60
            ? t('predictive.high', 'High')
            : t('predictive.medium', 'Medium'),
        },
      ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'p-5 rounded-xl bg-card/30 backdrop-blur border border-border/20',
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">
          {t('predictive.acceptanceProbabilityTitle', 'Acceptance Probability')}
        </h3>
        <ConfidenceBadge score={confidence} />
      </div>

      {/* Radial gauge */}
      <RadialGauge value={probability} />

      {/* Contributing factors */}
      {displayFactors.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-muted-foreground font-medium">
            {t('predictive.contributingFactors', 'Contributing factors')}
          </p>
          {displayFactors.map((factor, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-1.5 px-2 rounded-md bg-muted/20"
            >
              <span className="text-xs text-muted-foreground">{factor.label}</span>
              <span
                className={cn(
                  'text-[10px] font-medium px-1.5 py-0.5 rounded',
                  IMPACT_STYLES[factor.impact]
                )}
              >
                {factor.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

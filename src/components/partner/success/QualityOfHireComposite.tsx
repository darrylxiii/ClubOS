import { useTranslation } from 'react-i18next';
import { motion } from '@/lib/motion';
import { Award, Shield, Zap, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QualityOfHireCompositeProps {
  qualityScore: number; // 0-100 composite
  retentionRate: number; // 0-100
  avgTimeToHire: number; // days
  isLoading?: boolean;
}

interface FactorProps {
  icon: React.ElementType;
  label: string;
  value: number;
  weight: string;
  color: string;
  delay: number;
}

function Factor({ icon: Icon, label, value, weight, color, delay }: FactorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.25 }}
      className="flex items-center justify-between p-3 rounded-lg bg-card/20 border border-border/10"
    >
      <div className="flex items-center gap-3">
        <div className={cn('p-1.5 rounded-lg', color)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-[10px] text-muted-foreground">{weight}</p>
        </div>
      </div>
      <span className="text-lg font-bold tabular-nums">{value}</span>
    </motion.div>
  );
}

function ScoreRing({ score, size = 100 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const ringColor = score >= 80 ? 'stroke-emerald-500' : score >= 60 ? 'stroke-amber-500' : 'stroke-rose-500';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={6}
          className="stroke-muted/30"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={6}
          strokeLinecap="round"
          className={ringColor}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <span className="absolute text-2xl font-bold tabular-nums">{score}</span>
    </div>
  );
}

export function QualityOfHireComposite({
  qualityScore,
  retentionRate,
  avgTimeToHire,
  isLoading,
}: QualityOfHireCompositeProps) {
  const { t } = useTranslation('partner');

  // Compute individual factor scores for display
  const productivityScore = avgTimeToHire > 0
    ? Math.min(100, Math.round((30 / avgTimeToHire) * 100))
    : 75;

  // NPS component is baked into qualityScore; back-calculate from the composite
  // qualityScore = retention*0.4 + productivity*0.3 + nps*0.3
  const impliedNps = Math.max(0, Math.min(100,
    Math.round((qualityScore - retentionRate * 0.4 - productivityScore * 0.3) / 0.3)
  ));

  const factors: FactorProps[] = [
    {
      icon: Shield,
      label: t('successMetrics.retentionFactor', '90-Day Retention'),
      value: retentionRate,
      weight: t('successMetrics.weight40', '40% weight'),
      color: 'bg-emerald-500/10 text-emerald-500',
      delay: 0.4,
    },
    {
      icon: Zap,
      label: t('successMetrics.productivityFactor', 'Time-to-Productivity'),
      value: productivityScore,
      weight: t('successMetrics.weight30', '30% weight'),
      color: 'bg-amber-500/10 text-amber-500',
      delay: 0.5,
    },
    {
      icon: Users,
      label: t('successMetrics.satisfactionFactor', 'Hiring Manager Satisfaction'),
      value: impliedNps,
      weight: t('successMetrics.weight30', '30% weight'),
      color: 'bg-primary/10 text-primary',
      delay: 0.6,
    },
  ];

  if (isLoading) {
    return (
      <div className="p-6 rounded-xl bg-card/30 backdrop-blur border border-border/20 animate-pulse">
        <div className="h-4 w-48 bg-muted rounded mb-6" />
        <div className="flex items-center gap-8">
          <div className="h-24 w-24 bg-muted rounded-full" />
          <div className="flex-1 space-y-3">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="p-6 rounded-xl bg-card/30 backdrop-blur border border-border/20 hover:border-primary/20 transition-colors duration-200"
      role="region"
      aria-label={t('successMetrics.qualityOfHire', 'Quality of Hire Composite')}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
          <Award className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-medium text-muted-foreground">
          {t('successMetrics.qualityOfHire', 'Quality of Hire Composite')}
        </h3>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* Score ring */}
        <div className="shrink-0 text-center">
          <ScoreRing score={qualityScore} />
          <p className="text-xs text-muted-foreground mt-2">
            {t('successMetrics.compositeScore', 'Composite Score')}
          </p>
        </div>

        {/* Individual factors */}
        <div className="flex-1 w-full space-y-2">
          {factors.map((factor) => (
            <Factor key={factor.label} {...factor} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

import { useTranslation } from 'react-i18next';
import { motion } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { GlassMetricCard } from '@/components/partner/shared';
import { useBrandScore } from '@/hooks/useBrandScore';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, Users, TrendingUp } from 'lucide-react';

interface BrandScoreOverviewProps {
  companyId: string;
}

/** Color for the circular score indicator */
function scoreColor(score: number): string {
  if (score >= 75) return '#10b981'; // emerald-500
  if (score >= 50) return '#f59e0b'; // amber-500
  if (score >= 25) return '#f97316'; // orange-500
  return '#ef4444'; // red-500
}

function scoreLabel(score: number, t: (key: string, fallback: string) => string): string {
  if (score >= 75) return 'Excellent';
  if (score >= 50) return 'Good';
  if (score >= 25) return 'Fair';
  return 'Needs Work';
}

/** SVG circular progress ring */
function CircularProgress({ score, size = 140 }: { score: number; size?: number }) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = scoreColor(score);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-border/30"
      />
      {/* Progress ring */}
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}

export function BrandScoreOverview({ companyId }: BrandScoreOverviewProps) {
  const { t } = useTranslation('partner');
  const {
    brandScore,
    acceptanceRate,
    sentimentAvg,
    applicationTrend,
    applicationTrendPct,
    isLoading,
  } = useBrandScore(companyId);

  if (isLoading) {
    return (
      <div className="p-6 rounded-xl bg-card/30 backdrop-blur border border-border/20 space-y-6">
        <div className="flex items-center gap-8">
          <Skeleton className="h-[140px] w-[140px] rounded-full" />
          <div className="space-y-3 flex-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    );
  }

  const color = scoreColor(brandScore);
  const label = scoreLabel(brandScore, t);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="p-6 rounded-xl bg-card/30 backdrop-blur border border-border/20 space-y-6"
    >
      {/* Top: Big score circle + summary */}
      <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
        <div className="relative shrink-0">
          <CircularProgress score={brandScore} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className="text-4xl font-bold tabular-nums"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.4 }}
            >
              {brandScore}
            </motion.span>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>
        </div>

        <div className="text-center sm:text-left space-y-1">
          <h2 className="text-xl font-semibold">
            {t('brandCenter.brandScore', 'Employer Brand Score')}
          </h2>
          <p className="text-sm text-muted-foreground max-w-md">
            {t(
              'brandCenter.brandScoreDescription',
              'A composite measure of how attractive your company is to candidates, based on offer acceptance, interview sentiment, and application momentum.'
            )}
          </p>
          <span
            className={cn(
              'inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium',
              'border'
            )}
            style={{
              color,
              borderColor: color,
              backgroundColor: `${color}15`,
            }}
          >
            {label}
          </span>
        </div>
      </div>

      {/* Factor cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <GlassMetricCard
          icon={CheckCircle2}
          label={t('brandCenter.offerAcceptance', 'Offer Acceptance')}
          value={`${acceptanceRate}%`}
          trend={acceptanceRate >= 70 ? 'up' : acceptanceRate >= 40 ? 'neutral' : 'down'}
          trendLabel={acceptanceRate >= 70 ? t('brandCenter.strong', 'Strong') : t('brandCenter.improvable', 'Improvable')}
          color="emerald"
          subtitle={t('brandCenter.offerAcceptanceSub', 'Of offers accepted by candidates')}
          delay={0.1}
        />
        <GlassMetricCard
          icon={Users}
          label={t('brandCenter.interviewSentiment', 'Interview Sentiment')}
          value={`${sentimentAvg}%`}
          trend={sentimentAvg >= 70 ? 'up' : sentimentAvg >= 40 ? 'neutral' : 'down'}
          trendLabel={sentimentAvg >= 70 ? t('brandCenter.positive', 'Positive') : t('brandCenter.mixed', 'Mixed')}
          color="primary"
          subtitle={t('brandCenter.interviewSentimentSub', 'Average scorecard rating')}
          delay={0.2}
        />
        <GlassMetricCard
          icon={TrendingUp}
          label={t('brandCenter.applicationVolume', 'Application Volume')}
          value={`${applicationTrendPct > 0 ? '+' : ''}${applicationTrendPct}%`}
          trend={applicationTrend}
          trendLabel={
            applicationTrend === 'up'
              ? t('brandCenter.growing', 'Growing')
              : applicationTrend === 'down'
                ? t('brandCenter.declining', 'Declining')
                : t('brandCenter.stable', 'Stable')
          }
          color="amber"
          subtitle={t('brandCenter.applicationVolumeSub', 'vs. previous 30 days')}
          delay={0.3}
        />
      </div>
    </motion.div>
  );
}

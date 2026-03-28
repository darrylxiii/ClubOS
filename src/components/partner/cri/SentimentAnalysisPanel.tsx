import { useTranslation } from 'react-i18next';
import { motion } from '@/lib/motion';
import { TrendSparkline } from '@/components/partner/shared';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SentimentAnalysisPanelProps {
  currentSentiment: number;
  sentimentTrend: { value: number; timestamp: string }[];
  sentimentDirection: 'warming' | 'cooling' | 'stable';
  className?: string;
}

function getSentimentConfig(score: number) {
  if (score >= 70) return { color: 'text-emerald-500', bg: 'bg-emerald-500/10', sparkColor: 'emerald' as const };
  if (score >= 40) return { color: 'text-amber-500', bg: 'bg-amber-500/10', sparkColor: 'amber' as const };
  return { color: 'text-rose-500', bg: 'bg-rose-500/10', sparkColor: 'rose' as const };
}

function getDirectionConfig(direction: 'warming' | 'cooling' | 'stable') {
  switch (direction) {
    case 'warming':
      return { icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
    case 'cooling':
      return { icon: TrendingDown, color: 'text-rose-500', bg: 'bg-rose-500/10' };
    case 'stable':
      return { icon: Minus, color: 'text-muted-foreground', bg: 'bg-muted' };
  }
}

export function SentimentAnalysisPanel({
  currentSentiment,
  sentimentTrend,
  sentimentDirection,
  className,
}: SentimentAnalysisPanelProps) {
  const { t } = useTranslation('partner');
  const sentimentConfig = getSentimentConfig(currentSentiment);
  const dirConfig = getDirectionConfig(sentimentDirection);
  const DirIcon = dirConfig.icon;

  const sparkData = sentimentTrend.slice(-8).map((p) => p.value);
  const directionLabels: Record<string, string> = {
    warming: t('cri.sentiment.warmingUp', 'Warming up'),
    cooling: t('cri.sentiment.coolingDown', 'Cooling down'),
    stable: t('cri.sentiment.stable', 'Stable'),
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'p-5 rounded-xl bg-card/30 backdrop-blur border border-border/20 space-y-4',
        className,
      )}
    >
      <h3 className="text-sm font-medium text-muted-foreground">
        {t('cri.sentiment.title', 'Sentiment Analysis')}
      </h3>

      {/* Big score */}
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'flex items-center justify-center w-16 h-16 rounded-2xl text-2xl font-bold tabular-nums',
            sentimentConfig.bg,
            sentimentConfig.color,
          )}
        >
          {currentSentiment}
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <div className={cn('p-1 rounded-md', dirConfig.bg)}>
              <DirIcon className={cn('h-3.5 w-3.5', dirConfig.color)} />
            </div>
            <span className={cn('text-sm font-medium', dirConfig.color)}>
              {directionLabels[sentimentDirection]}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('cri.sentiment.outOf', 'out of 100')}
          </p>
        </div>
      </div>

      {/* Sparkline */}
      {sparkData.length >= 2 ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {t('cri.sentiment.last8', 'Last {{count}} interactions', { count: sparkData.length })}
          </p>
          <TrendSparkline
            data={sparkData}
            color={sentimentConfig.sparkColor}
            height={36}
            width={240}
            showArea
            showEndDot
          />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">
          {t('cri.sentiment.notEnoughData', 'Not enough data for trend analysis')}
        </p>
      )}

      {/* Individual dots */}
      {sentimentTrend.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {sentimentTrend.slice(-12).map((point, i) => {
            const dotConfig = getSentimentConfig(point.value);
            return (
              <div
                key={`${point.timestamp}-${i}`}
                className={cn('w-2.5 h-2.5 rounded-full', dotConfig.bg)}
                style={{ backgroundColor: `hsl(var(--${dotConfig.sparkColor === 'emerald' ? 'emerald' : dotConfig.sparkColor === 'amber' ? 'amber' : 'rose'}-500))` }}
                title={`${point.value}/100 - ${new Date(point.timestamp).toLocaleDateString()}`}
              />
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

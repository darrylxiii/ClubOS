import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';

interface ConfidenceBadgeProps {
  /** Confidence score 0-100 */
  score: number;
  /** Optional label override (defaults to "XX% confidence") */
  label?: string;
  /** Size variant */
  size?: 'sm' | 'md';
  className?: string;
}

export function ConfidenceBadge({ score, label, size = 'sm', className }: ConfidenceBadgeProps) {
  const { t } = useTranslation('common');

  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

  const config = clampedScore >= 80
    ? { bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30', level: t('confidence.high', 'High') }
    : clampedScore >= 50
    ? { bg: 'bg-amber-500/10 text-amber-500 border-amber-500/30', level: t('confidence.medium', 'Medium') }
    : { bg: 'bg-rose-500/10 text-rose-500 border-rose-500/30', level: t('confidence.low', 'Low') };

  const displayLabel = label || t('confidence.score', '{{score}}% confidence', { score: clampedScore });

  return (
    <Badge
      variant="outline"
      className={cn(
        config.bg,
        size === 'sm' ? 'text-[10px] py-0 px-1.5' : 'text-xs py-0.5 px-2',
        className
      )}
      title={`${config.level}: ${clampedScore}%`}
    >
      {displayLabel}
    </Badge>
  );
}

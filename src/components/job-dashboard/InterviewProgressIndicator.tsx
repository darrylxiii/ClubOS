import { memo } from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface InterviewProgressIndicatorProps {
  completed: number;
  total: number;
  className?: string;
}

export const InterviewProgressIndicator = memo(({
  completed,
  total,
  className,
}: InterviewProgressIndicatorProps) => {
  const { t } = useTranslation('jobs');
  if (total === 0) return null;

  const pct = Math.min((completed / total) * 100, 100);
  const isComplete = completed >= total;

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div className="flex-1 h-1 bg-muted/40 rounded-full overflow-hidden min-w-[32px]">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            isComplete ? 'bg-success' : 'bg-primary',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn(
        'text-[9px] tabular-nums font-medium shrink-0',
        isComplete ? 'text-success' : 'text-muted-foreground',
      )}>
        {completed}/{total}
      </span>
    </div>
  );
});

InterviewProgressIndicator.displayName = 'InterviewProgressIndicator';

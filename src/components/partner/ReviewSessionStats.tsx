import { useMemo } from 'react';
import { Clock, CheckCircle2, XCircle, Pause, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReviewSessionStatsProps {
  totalInQueue: number;
  currentIndex: number;
  approvedCount: number;
  rejectedCount: number;
  heldCount: number;
  sessionStartTime: number;
  className?: string;
}

export function ReviewSessionStats({
  totalInQueue,
  currentIndex,
  approvedCount,
  rejectedCount,
  heldCount,
  sessionStartTime,
  className,
}: ReviewSessionStatsProps) {
  const totalReviewed = approvedCount + rejectedCount + heldCount;

  const avgTimePerReview = useMemo(() => {
    if (totalReviewed === 0) return null;
    const elapsed = (Date.now() - sessionStartTime) / 1000;
    const avg = elapsed / totalReviewed;
    if (avg < 60) return `${Math.round(avg)}s`;
    return `${Math.round(avg / 60)}m ${Math.round(avg % 60)}s`;
  }, [totalReviewed, sessionStartTime]);

  return (
    <div className={cn(
      'flex items-center gap-4 text-xs text-muted-foreground flex-wrap',
      className,
    )}>
      <span className="flex items-center gap-1">
        <Zap className="h-3 w-3 text-primary" />
        <span className="font-medium text-foreground">{totalReviewed}</span> reviewed
      </span>

      {approvedCount > 0 && (
        <span className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-success" />
          {approvedCount}
        </span>
      )}

      {rejectedCount > 0 && (
        <span className="flex items-center gap-1">
          <XCircle className="h-3 w-3 text-destructive" />
          {rejectedCount}
        </span>
      )}

      {heldCount > 0 && (
        <span className="flex items-center gap-1">
          <Pause className="h-3 w-3 text-warning" />
          {heldCount}
        </span>
      )}

      {avgTimePerReview && (
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          avg {avgTimePerReview}
        </span>
      )}

      {totalInQueue > 0 && (
        <span className="ml-auto text-muted-foreground/70">
          {totalInQueue - totalReviewed} remaining
        </span>
      )}
    </div>
  );
}

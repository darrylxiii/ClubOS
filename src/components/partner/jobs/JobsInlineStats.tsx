import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JobsInlineStatsProps {
  activeJobs: number;
  totalCandidates: number;
  avgDaysOpen: number | null;
  conversionRate: number | null;
  clubSyncActive: number;
  totalJobs: number;
  className?: string;
}

interface StatItemProps {
  value: string | number;
  label: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  highlight?: boolean;
}

const StatItem = memo(({ value, label, trend, trendValue, highlight }: StatItemProps) => {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <div className="flex items-center gap-2">
      <span className={cn(
        'text-lg font-bold tabular-nums',
        highlight ? 'text-primary' : 'text-foreground'
      )}>
        {value}
      </span>
      <span className="text-sm text-muted-foreground">{label}</span>
      {trend && trendValue && (
        <div className={cn('flex items-center gap-0.5 text-xs', trendColor)}>
          <TrendIcon className="h-3 w-3" />
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  );
});

StatItem.displayName = 'StatItem';

export const JobsInlineStats = memo(({
  activeJobs,
  totalCandidates,
  avgDaysOpen,
  conversionRate,
  clubSyncActive,
  totalJobs,
  className,
}: JobsInlineStatsProps) => {
  const clubSyncPending = totalJobs - clubSyncActive;

  return (
    <div className={cn(
      'flex items-center gap-4 py-3 px-4 rounded-lg bg-card/30 border border-border/20 overflow-x-auto',
      className
    )}>
      <StatItem
        value={activeJobs}
        label="Active"
        highlight
      />
      
      <Separator orientation="vertical" className="h-6" />
      
      <StatItem
        value={totalCandidates}
        label="Candidates"
      />
      
      <Separator orientation="vertical" className="h-6" />
      
      <StatItem
        value={avgDaysOpen !== null ? `${avgDaysOpen}d` : '—'}
        label="Avg TTH"
      />
      
      <Separator orientation="vertical" className="h-6" />
      
      <StatItem
        value={conversionRate !== null ? `${conversionRate}%` : '—'}
        label="Conv"
      />
      
      <Separator orientation="vertical" className="h-6" />
      
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-primary" />
        <span className="text-lg font-bold text-foreground tabular-nums">{clubSyncActive}</span>
        <span className="text-sm text-muted-foreground">Club Sync</span>
        {clubSyncPending > 0 && (
          <Badge variant="outline" className="text-[10px] py-0 h-5 border-primary/30 text-primary">
            +{clubSyncPending} available
          </Badge>
        )}
      </div>
    </div>
  );
});

JobsInlineStats.displayName = 'JobsInlineStats';

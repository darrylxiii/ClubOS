import { memo } from 'react';
import { Separator } from '@/components/ui/separator';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export interface PartnerStatItem {
  value: number;
  label: string;
  icon?: LucideIcon;
  format?: (v: number) => string;
  highlight?: boolean;
}

interface PartnerInlineStatsProps {
  stats: PartnerStatItem[];
  className?: string;
}

export const PartnerInlineStats = memo(({ stats, className }: PartnerInlineStatsProps) => {
  return (
    <div className={cn(
      'flex items-center gap-4 py-3 px-4 rounded-lg bg-card/30 backdrop-blur border border-border/20 overflow-x-auto',
      className
    )}>
      {stats.map((stat, index) => (
        <div key={stat.label} className="flex items-center gap-4">
          {index > 0 && <Separator orientation="vertical" className="h-6" />}
          <div className="flex items-center gap-2">
            {stat.icon && <stat.icon className="h-4 w-4 text-muted-foreground" />}
            <span className={cn(
              'text-lg font-bold tabular-nums',
              stat.highlight ? 'text-primary' : 'text-foreground'
            )}>
              <AnimatedNumber
                value={stat.value}
                format={stat.format || ((v) => Math.round(v).toLocaleString())}
              />
            </span>
            <span className="text-sm text-muted-foreground whitespace-nowrap">{stat.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
});

PartnerInlineStats.displayName = 'PartnerInlineStats';

import { cn } from '@/lib/utils';
import { AlertTriangle, Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';

interface RottingIndicatorProps {
  lastContactedAt: string | null;
  className?: string;
  showLabel?: boolean;
}

export function RottingIndicator({ lastContactedAt, className, showLabel = false }: RottingIndicatorProps) {
  if (!lastContactedAt) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <div className={cn(
            'flex items-center gap-1 text-xs text-muted-foreground',
            className
          )}>
            <Clock className="w-3 h-3" />
            {showLabel && <span>Never contacted</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>This prospect has never been contacted</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  const daysSinceContact = Math.floor(
    (Date.now() - new Date(lastContactedAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Warning: 3-7 days
  // Rotting: 7+ days
  // Stale: 30+ days

  const getStatus = () => {
    if (daysSinceContact >= 30) return 'stale';
    if (daysSinceContact >= 7) return 'rotting';
    if (daysSinceContact >= 3) return 'warning';
    return 'fresh';
  };

  const status = getStatus();

  if (status === 'fresh') {
    return showLabel ? (
      <div className={cn('flex items-center gap-1 text-xs text-green-500', className)}>
        <Clock className="w-3 h-3" />
        <span>{formatDistanceToNow(new Date(lastContactedAt), { addSuffix: true })}</span>
      </div>
    ) : null;
  }

  const statusConfig = {
    warning: {
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-500/30',
      label: 'Needs attention',
      description: `${daysSinceContact} days since last contact`,
    },
    rotting: {
      color: 'text-red-500',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/30',
      label: 'Rotting',
      description: `${daysSinceContact} days since last contact - needs immediate attention`,
    },
    stale: {
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/50',
      borderColor: 'border-border',
      label: 'Stale',
      description: `${daysSinceContact} days since last contact - consider archiving or re-engaging`,
    },
  };

  const config = statusConfig[status];

  return (
    <Tooltip>
      <TooltipTrigger>
        <div className={cn(
          'flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border',
          config.color,
          config.bgColor,
          config.borderColor,
          status === 'rotting' && 'animate-pulse',
          className
        )}>
          {status === 'rotting' || status === 'warning' ? (
            <AlertTriangle className="w-3 h-3" />
          ) : (
            <Clock className="w-3 h-3" />
          )}
          {showLabel && <span>{daysSinceContact}d</span>}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{config.label}</p>
        <p className="text-xs text-muted-foreground">{config.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface KPIFreshnessIndicatorProps {
  lastUpdated: Date | string | null;
  className?: string;
}

type FreshnessStatus = 'fresh' | 'stale' | 'critical';

function getFreshnessStatus(lastUpdated: Date | string | null): { status: FreshnessStatus; hoursAgo: number } {
  if (!lastUpdated) {
    return { status: 'critical', hoursAgo: -1 };
  }

  const lastUpdateDate = typeof lastUpdated === 'string' ? new Date(lastUpdated) : lastUpdated;
  const now = new Date();
  const hoursAgo = (now.getTime() - lastUpdateDate.getTime()) / (1000 * 60 * 60);

  if (hoursAgo < 1) {
    return { status: 'fresh', hoursAgo };
  } else if (hoursAgo < 24) {
    return { status: 'stale', hoursAgo };
  } else {
    return { status: 'critical', hoursAgo };
  }
}

const statusConfig = {
  fresh: {
    icon: CheckCircle,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
    label: 'Fresh',
  },
  stale: {
    icon: Clock,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10 border-amber-500/20',
    label: 'Stale',
  },
  critical: {
    icon: AlertTriangle,
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10 border-rose-500/20',
    label: 'Outdated',
  },
};

export function KPIFreshnessIndicator({ lastUpdated, className }: KPIFreshnessIndicatorProps) {
  const { status, hoursAgo } = getFreshnessStatus(lastUpdated);
  const config = statusConfig[status];
  const Icon = config.icon;

  const tooltipContent = lastUpdated 
    ? `Last updated ${formatDistanceToNow(typeof lastUpdated === 'string' ? new Date(lastUpdated) : lastUpdated, { addSuffix: true })}`
    : 'No update time available';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn(
              "gap-1 text-[10px] px-1.5 py-0 cursor-help",
              config.bgColor,
              config.color,
              className
            )}
          >
            <Icon className="h-2.5 w-2.5" />
            {hoursAgo >= 0 && hoursAgo < 1 
              ? 'Just now' 
              : hoursAgo >= 1 && hoursAgo < 24 
                ? `${Math.round(hoursAgo)}h ago`
                : hoursAgo >= 24
                  ? `${Math.round(hoursAgo / 24)}d ago`
                  : 'Unknown'
            }
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

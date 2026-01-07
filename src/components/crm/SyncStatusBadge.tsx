import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { formatDistanceToNow, differenceInMinutes } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface SyncStatusBadgeProps {
  isSyncing: boolean;
  lastSync?: {
    completed_at: string | null;
    created_records: number;
    updated_records: number;
    failed_records: number;
    errors?: unknown;
    sync_type?: string;
  } | null;
  syncErrors?: { email?: string; error: string }[];
  onRefresh?: () => void;
  compact?: boolean;
}

export function SyncStatusBadge({ 
  isSyncing, 
  lastSync, 
  syncErrors = [],
  onRefresh,
  compact = false
}: SyncStatusBadgeProps) {
  if (isSyncing) {
    return (
      <Badge variant="outline" className="bg-purple-500/10 border-purple-500/30 text-purple-400 animate-pulse">
        <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
        {compact ? 'Syncing…' : 'Syncing Instantly…'}
      </Badge>
    );
  }

  if (!lastSync?.completed_at) {
    return (
      <Badge variant="outline" className="bg-muted/20 border-border/30 text-muted-foreground">
        <Clock className="w-3 h-3 mr-1.5" />
        Never synced
      </Badge>
    );
  }

  const hasErrors = (lastSync.failed_records || 0) > 0;
  const completedAt = new Date(lastSync.completed_at);
  const timeAgo = formatDistanceToNow(completedAt, { addSuffix: true });
  const totalSynced = (lastSync.created_records || 0) + (lastSync.updated_records || 0);
  const minutesAgo = differenceInMinutes(new Date(), completedAt);
  const isStale = minutesAgo > 60; // Consider stale if over 1 hour old

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="outline" 
          className={cn(
            'cursor-default transition-colors',
            hasErrors 
              ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' 
              : isStale
                ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                : 'bg-green-500/10 border-green-500/30 text-green-400',
            onRefresh && 'cursor-pointer hover:bg-muted/40'
          )}
          onClick={onRefresh}
        >
          {hasErrors ? (
            <AlertCircle className="w-3 h-3 mr-1.5" />
          ) : isStale ? (
            <Clock className="w-3 h-3 mr-1.5" />
          ) : totalSynced > 0 ? (
            <CheckCircle className="w-3 h-3 mr-1.5" />
          ) : (
            <RefreshCw className="w-3 h-3 mr-1.5" />
          )}
          {compact ? timeAgo : `Synced ${timeAgo}`}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="text-xs space-y-1.5">
          <p className="font-medium">
            {lastSync.sync_type 
              ? lastSync.sync_type.replace('instantly_', '').replace('_', ' ')
              : 'Instantly sync'
            }
          </p>
          <p><strong>Last sync:</strong> {timeAgo}</p>
          <p>
            <span className="text-green-400">{lastSync.created_records || 0} new</span>
            {' • '}
            <span className="text-blue-400">{lastSync.updated_records || 0} updated</span>
            {hasErrors && (
              <>
                {' • '}
                <span className="text-red-400">{lastSync.failed_records} failed</span>
              </>
            )}
          </p>
          {isStale && !hasErrors && (
            <p className="text-orange-400">
              ⚠ Data may be stale (over 1 hour old)
            </p>
          )}
          {hasErrors && syncErrors[0] && (
            <p className="text-red-400 truncate">
              Error: {syncErrors[0].error}
            </p>
          )}
          {onRefresh && (
            <p className="text-muted-foreground pt-1 border-t border-border/30">
              Click to refresh
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

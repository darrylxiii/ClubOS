import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SyncStatusBadgeProps {
  isSyncing: boolean;
  lastSync?: {
    completed_at: string | null;
    created_records: number;
    updated_records: number;
    failed_records: number;
    errors?: unknown;
  } | null;
  syncErrors?: { email?: string; error: string }[];
}

export function SyncStatusBadge({ isSyncing, lastSync, syncErrors = [] }: SyncStatusBadgeProps) {
  if (isSyncing) {
    return (
      <Badge variant="outline" className="bg-purple-500/10 border-purple-500/30 text-purple-400 animate-pulse">
        <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
        Syncing Instantly…
      </Badge>
    );
  }

  if (!lastSync?.completed_at) {
    return null;
  }

  const hasErrors = (lastSync.failed_records || 0) > 0;
  const timeAgo = formatDistanceToNow(new Date(lastSync.completed_at), { addSuffix: true });
  const totalSynced = (lastSync.created_records || 0) + (lastSync.updated_records || 0);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="outline" 
          className={hasErrors 
            ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' 
            : 'bg-muted/30 border-border/30 text-muted-foreground'
          }
        >
          {hasErrors ? (
            <AlertCircle className="w-3 h-3 mr-1.5" />
          ) : totalSynced > 0 ? (
            <CheckCircle className="w-3 h-3 mr-1.5" />
          ) : (
            <Clock className="w-3 h-3 mr-1.5" />
          )}
          Last sync {timeAgo}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="text-xs space-y-1">
          <p><strong>Last sync:</strong> {timeAgo}</p>
          <p>
            {lastSync.created_records || 0} new • {lastSync.updated_records || 0} updated
            {hasErrors && ` • ${lastSync.failed_records} failed`}
          </p>
          {hasErrors && syncErrors[0] && (
            <p className="text-destructive truncate">
              Error: {syncErrors[0].error}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

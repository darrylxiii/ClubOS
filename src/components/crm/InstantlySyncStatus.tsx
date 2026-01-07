import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  RefreshCw,
  Activity,
  Users,
  Mail,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useSyncDiagnostics, getSyncErrors, SyncLog } from '@/hooks/useSyncDiagnostics';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface InstantlySyncStatusProps {
  onSyncCampaigns?: () => Promise<void>;
  onSyncLeads?: () => Promise<void>;
  onSyncHealth?: () => Promise<void>;
  syncing?: boolean;
}

function SyncTypeCard({ 
  label, 
  icon: Icon, 
  sync, 
  onSync, 
  syncing 
}: { 
  label: string; 
  icon: React.ElementType; 
  sync: SyncLog | null; 
  onSync?: () => Promise<void>;
  syncing?: boolean;
}) {
  const hasErrors = sync && (sync.failed_records || 0) > 0;
  const errors = getSyncErrors(sync);
  
  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-lg border",
      hasErrors 
        ? "bg-yellow-500/5 border-yellow-500/20" 
        : sync?.completed_at 
          ? "bg-muted/30 border-border/30"
          : "bg-muted/10 border-border/20"
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-md",
          hasErrors ? "bg-yellow-500/10" : "bg-primary/10"
        )}>
          <Icon className={cn(
            "w-4 h-4",
            hasErrors ? "text-yellow-500" : "text-primary"
          )} />
        </div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          {sync?.completed_at ? (
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(sync.completed_at), { addSuffix: true })}
              </p>
              {sync.synced_records !== undefined && (
                <span className="text-xs text-muted-foreground">
                  • {sync.created_records || 0} new, {sync.updated_records || 0} updated
                </span>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Never synced</p>
          )}
          {hasErrors && errors[0] && (
            <p className="text-xs text-yellow-600 mt-1 truncate max-w-[200px]">
              {errors[0].error}
            </p>
          )}
        </div>
      </div>
      {onSync && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onSync}
              disabled={syncing}
              className="h-8 w-8"
            >
              {syncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Sync now</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

export function InstantlySyncStatus({ 
  onSyncCampaigns, 
  onSyncLeads,
  onSyncHealth,
  syncing = false 
}: InstantlySyncStatusProps) {
  const { data: diagnostics, isLoading, refetch } = useSyncDiagnostics();
  const [showHistory, setShowHistory] = useState(false);

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/30">
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading sync status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { syncsByType, stats, recentSyncs } = diagnostics || {
    syncsByType: { campaigns: null, leads: null, accountHealth: null },
    stats: { totalSyncsToday: 0, successRate: 0, avgSyncDuration: 0, lastSuccessfulSync: null },
    recentSyncs: [],
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Instantly Sync Status
          </CardTitle>
          <div className="flex items-center gap-2">
            {stats.lastSuccessfulSync && (
              <Badge variant="outline" className="text-xs">
                Last success: {formatDistanceToNow(new Date(stats.lastSuccessfulSync), { addSuffix: true })}
              </Badge>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => refetch()}
                  className="h-7 w-7"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh status</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 p-3 bg-muted/20 rounded-lg">
          <div className="text-center">
            <p className="text-lg font-semibold">{stats.totalSyncsToday}</p>
            <p className="text-xs text-muted-foreground">Syncs today</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">{stats.successRate.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">Success rate</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">{stats.avgSyncDuration}s</p>
            <p className="text-xs text-muted-foreground">Avg duration</p>
          </div>
        </div>

        {/* Sync Type Cards */}
        <div className="space-y-2">
          <SyncTypeCard 
            label="Campaigns" 
            icon={Mail} 
            sync={syncsByType.campaigns}
            onSync={onSyncCampaigns}
            syncing={syncing}
          />
          <SyncTypeCard 
            label="Leads" 
            icon={Users} 
            sync={syncsByType.leads}
            onSync={onSyncLeads}
            syncing={syncing}
          />
          <SyncTypeCard 
            label="Account Health" 
            icon={Activity} 
            sync={syncsByType.accountHealth}
            onSync={onSyncHealth}
            syncing={syncing}
          />
        </div>

        {/* Sync History */}
        <Collapsible open={showHistory} onOpenChange={setShowHistory}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between h-8 text-xs">
              <span>Recent Sync History</span>
              {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
              {recentSyncs.slice(0, 10).map((sync) => {
                const hasErrors = (sync.failed_records || 0) > 0;
                return (
                  <div 
                    key={sync.id} 
                    className="flex items-center justify-between text-xs p-2 rounded bg-muted/20"
                  >
                    <div className="flex items-center gap-2">
                      {hasErrors ? (
                        <AlertCircle className="w-3 h-3 text-yellow-500" />
                      ) : (
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      )}
                      <span className="text-muted-foreground">
                        {sync.sync_type.replace('instantly_', '').replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>{sync.synced_records || 0} synced</span>
                      {sync.completed_at && (
                        <span>{format(new Date(sync.completed_at), 'HH:mm')}</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {recentSyncs.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No sync history available
                </p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
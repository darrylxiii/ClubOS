import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Wifi, 
  WifiOff,
  Clock,
  Zap,
  Webhook
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface ConnectionStatus {
  connected: boolean;
  workspace_name?: string;
  email?: string;
  latency_ms?: number;
  key_preview?: string;
  error?: string;
  timestamp?: string;
}

interface SyncLog {
  id: string;
  sync_type: string;
  synced_records: number;
  failed_records: number;
  errors: unknown;
  started_at: string;
  completed_at: string | null;
}

export function InstantlySyncStatus() {
  const queryClient = useQueryClient();
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Test connection status
  const connectionQuery = useQuery({
    queryKey: ['instantly-connection-status'],
    queryFn: async (): Promise<ConnectionStatus> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('test-instantly-connection', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (response.error) {
        console.error('Connection test error:', response.error);
        return { connected: false, error: response.error.message };
      }

      return response.data as ConnectionStatus;
    },
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
  });

  // Get recent sync logs
  const syncLogsQuery = useQuery({
    queryKey: ['instantly-sync-logs'],
    queryFn: async (): Promise<SyncLog[]> => {
      const { data, error } = await supabase
        .from('crm_sync_logs')
        .select('*')
        .or('sync_type.ilike.%instantly%,source.eq.instantly')
        .order('started_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return (data || []) as SyncLog[];
    },
    staleTime: 30000,
  });

  // Trigger campaign sync
  const syncCampaignsMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('sync-instantly-campaigns', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Synced ${data.created + data.updated} campaigns`);
      queryClient.invalidateQueries({ queryKey: ['instantly-sync-logs'] });
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error.message}`);
    }
  });

  // Trigger leads sync
  const syncLeadsMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('sync-instantly-leads', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { mode: 'full' }
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Synced ${data.synced || 0} leads`);
      queryClient.invalidateQueries({ queryKey: ['instantly-sync-logs'] });
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error.message}`);
    }
  });

  // Register webhooks
  const registerWebhooksMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('register-instantly-webhooks', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { action: 'register' }
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Webhook registered: ${data.events_registered?.length || 0} events`);
    },
    onError: (error) => {
      toast.error(`Webhook registration failed: ${error.message}`);
    }
  });

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    await queryClient.invalidateQueries({ queryKey: ['instantly-connection-status'] });
    setIsTestingConnection(false);
  };

  const connection = connectionQuery.data;
  const recentSyncs = syncLogsQuery.data || [];
  const lastSuccessfulSync = recentSyncs.find(s => s.failed_records === 0);

  return (
    <Card variant="static" className="border-border/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Instantly Integration Status
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleTestConnection}
            disabled={connectionQuery.isLoading || isTestingConnection}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${(connectionQuery.isLoading || isTestingConnection) ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
          <div className="flex items-center gap-3">
            {connectionQuery.isLoading ? (
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            ) : connection?.connected ? (
              <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Wifi className="h-4 w-4 text-emerald-500" />
              </div>
            ) : (
              <div className="h-8 w-8 rounded-full bg-destructive/20 flex items-center justify-center">
                <WifiOff className="h-4 w-4 text-destructive" />
              </div>
            )}
            <div>
              <p className="font-medium text-sm">
                {connectionQuery.isLoading ? 'Testing connection...' : 
                  connection?.connected ? 'Connected' : 'Disconnected'}
              </p>
              {connection?.connected && (
                <p className="text-xs text-muted-foreground">
                  {connection.workspace_name} • {connection.latency_ms}ms
                </p>
              )}
              {!connection?.connected && connection?.error && (
                <p className="text-xs text-destructive">
                  {connection.error}
                </p>
              )}
            </div>
          </div>
          {connection?.connected && (
            <Badge variant="outline" className="text-emerald-600 border-emerald-600/30">
              <CheckCircle className="h-3 w-3 mr-1" />
              API Active
            </Badge>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => syncCampaignsMutation.mutate()}
            disabled={syncCampaignsMutation.isPending || !connection?.connected}
          >
            {syncCampaignsMutation.isPending ? (
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Sync Campaigns
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => syncLeadsMutation.mutate()}
            disabled={syncLeadsMutation.isPending || !connection?.connected}
          >
            {syncLeadsMutation.isPending ? (
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Sync Leads
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => registerWebhooksMutation.mutate()}
            disabled={registerWebhooksMutation.isPending || !connection?.connected}
          >
            {registerWebhooksMutation.isPending ? (
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Webhook className="h-3 w-3 mr-1" />
            )}
            Webhooks
          </Button>
        </div>

        {/* Recent Sync Activity */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Recent Sync Activity
          </p>
          {syncLogsQuery.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 bg-muted/30 rounded animate-pulse" />
              ))}
            </div>
          ) : recentSyncs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No sync activity found
            </p>
          ) : (
            <div className="space-y-1.5">
              {recentSyncs.map((sync) => (
                <div 
                  key={sync.id}
                  className="flex items-center justify-between p-2 rounded-md bg-muted/20 text-xs"
                >
                  <div className="flex items-center gap-2">
                    {sync.failed_records === 0 ? (
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                    ) : sync.synced_records > 0 ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-destructive" />
                    )}
                    <span className="font-medium">{sync.sync_type}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span>{sync.synced_records} synced</span>
                    {sync.failed_records > 0 && (
                      <span className="text-destructive">{sync.failed_records} failed</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(sync.started_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Last Successful Sync */}
        {lastSuccessfulSync && (
          <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/20">
            Last successful sync: {formatDistanceToNow(new Date(lastSuccessfulSync.started_at), { addSuffix: true })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

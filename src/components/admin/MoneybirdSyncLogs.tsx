import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useMoneybirdSettings, useMoneybirdSyncLogs } from '@/hooks/useMoneybird';
import { format, formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

const OPERATION_LABELS: Record<string, string> = {
  oauth_connect: 'Connected',
  oauth_disconnect: 'Disconnected',
  sync_contacts: 'Contact Sync',
  create_invoice: 'Invoice Created',
  sync_invoice_status: 'Status Sync',
  payment_received: 'Payment Received',
  webhook_payment: 'Webhook: Payment',
  webhook_status_change: 'Webhook: Status Change',
};

export function MoneybirdSyncLogs() {
  const { data: settings, isLoading: settingsLoading } = useMoneybirdSettings();
  const { data: logs, isLoading: logsLoading } = useMoneybirdSyncLogs(30);

  if (settingsLoading || !settings?.is_active) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Last 30 sync operations and events</CardDescription>
      </CardHeader>
      <CardContent>
        {logsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !logs?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            No sync activity yet
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="mt-0.5">
                    {log.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">
                        {OPERATION_LABELS[log.operation_type] || log.operation_type}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {log.entity_type}
                      </Badge>
                      {log.duration_ms && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {log.duration_ms}ms
                        </span>
                      )}
                    </div>
                    {log.error_message && (
                      <p className="text-sm text-red-500 mt-1 truncate">
                        {log.error_message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      {' • '}
                      {format(new Date(log.created_at), 'PPp')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

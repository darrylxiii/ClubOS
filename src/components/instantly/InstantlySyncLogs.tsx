import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SyncLog } from '@/hooks/useInstantlyData';
import { formatDistanceToNow } from 'date-fns';

interface InstantlySyncLogsProps {
  logs: SyncLog[];
}

export function InstantlySyncLogs({ logs }: InstantlySyncLogsProps) {
  const getStatus = (log: SyncLog) => {
    if ((log.failed_records || 0) > 0) return 'error';
    if ((log.synced_records || 0) > 0) return 'success';
    return 'pending';
  };

  const getStatusIcon = (log: SyncLog) => {
    const status = getStatus(log);
    switch (status) {
      case 'success': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <RefreshCw className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadgeClass = (log: SyncLog) => {
    const status = getStatus(log);
    switch (status) {
      case 'success': return 'bg-green-500/20 text-green-500 border-green-500/30';
      case 'error': return 'bg-red-500/20 text-red-500 border-red-500/30';
      default: return 'bg-muted/20 text-muted-foreground border-muted/30';
    }
  };

  if (logs.length === 0) {
    return (
      <Card className="p-6 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
        <div className="text-center text-muted-foreground">
          <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No sync history yet</p>
          <p className="text-sm">Click "Sync Now" to start syncing data from Instantly</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
      <h3 className="font-semibold mb-4">Recent Sync Activity</h3>
      <div className="space-y-3">
        {logs.map((log, index) => {
          const status = getStatus(log);
          
          return (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors"
            >
              {getStatusIcon(log)}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium capitalize">{log.sync_type.replace('_', ' ')}</span>
                  <Badge variant="outline" className={getStatusBadgeClass(log)}>
                    {status}
                  </Badge>
                </div>
                {log.synced_records !== null && (
                  <div className="text-sm text-muted-foreground">
                    {log.synced_records} records synced
                    {(log.failed_records || 0) > 0 && `, ${log.failed_records} failed`}
                  </div>
                )}
                {log.errors && typeof log.errors === 'object' && Object.keys(log.errors).length > 0 && (
                  <div className="text-sm text-red-500 truncate">
                    {JSON.stringify(log.errors).slice(0, 100)}
                  </div>
                )}
              </div>
              
              <div className="text-sm text-muted-foreground whitespace-nowrap">
                {log.created_at ? formatDistanceToNow(new Date(log.created_at), { addSuffix: true }) : '-'}
              </div>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}

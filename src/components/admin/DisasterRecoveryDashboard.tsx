import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Clock, Database, Shield, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface BackupVerificationLog {
  id: string;
  timestamp: string;
  backup_id: string;
  verification_status: 'success' | 'failed' | 'partial';
  tables_verified: number;
  total_tables: number;
  verification_duration_ms: number;
  issues: string[];
}

interface PlatformAlert {
  id: string;
  alert_type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  metadata: any;
  acknowledged: boolean;
  created_at: string;
}

export const DisasterRecoveryDashboard = () => {
  // Fetch latest backup verification
  const { data: latestBackup, isLoading: backupLoading } = useQuery({
    queryKey: ['latest-backup-verification'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backup_verification_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();
      
      if (error) throw error;
      return data as BackupVerificationLog;
    },
    refetchInterval: 60000 // Every minute
  });

  // Fetch recent backup verifications
  const { data: recentBackups } = useQuery({
    queryKey: ['recent-backup-verifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backup_verification_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as BackupVerificationLog[];
    },
    refetchInterval: 60000
  });

  // Fetch platform alerts
  const { data: alerts, refetch: refetchAlerts } = useQuery({
    queryKey: ['platform-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_alerts')
        .select('*')
        .eq('acknowledged', false)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as PlatformAlert[];
    },
    refetchInterval: 30000
  });

  // Calculate RPO (time since last verified backup)
  const rpoMinutes = latestBackup 
    ? Math.floor((Date.now() - new Date(latestBackup.timestamp).getTime()) / 60000)
    : null;

  const runManualVerification = async () => {
    try {
      toast.info('Running manual backup verification...');
      const { data, error } = await supabase.functions.invoke('verify-database-backups');
      
      if (error) throw error;
      
      toast.success('Backup verification completed successfully');
      // Refetch data
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Manual verification failed:', error);
      toast.error('Failed to run backup verification');
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('platform_alerts')
        .update({ 
          acknowledged: true, 
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', alertId);
      
      if (error) throw error;
      
      toast.success('Alert acknowledged');
      refetchAlerts();
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      toast.error('Failed to acknowledge alert');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'error': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed': return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'partial': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      default: return null;
    }
  };

  if (backupLoading) {
    return <div className="p-4">Loading disaster recovery status...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Disaster Recovery</h2>
          <p className="text-muted-foreground mt-1">
            Backup verification and platform health monitoring
          </p>
        </div>
        <Button onClick={runManualVerification}>
          Run Manual Verification
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* RTO Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recovery Time Objective</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4 hours</div>
            <p className="text-xs text-muted-foreground mt-1">
              Target maximum downtime
            </p>
          </CardContent>
        </Card>

        {/* RPO Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current RPO</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {rpoMinutes !== null ? `${rpoMinutes} min` : 'Unknown'}
              {rpoMinutes !== null && rpoMinutes <= 360 ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-500" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Target: ≤6 hours since last backup
            </p>
          </CardContent>
        </Card>

        {/* Backup Health */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Backup Health</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {latestBackup?.verification_status === 'success' ? (
                <>
                  Healthy {getStatusIcon('success')}
                </>
              ) : latestBackup?.verification_status === 'partial' ? (
                <>
                  Partial {getStatusIcon('partial')}
                </>
              ) : (
                <>
                  Failed {getStatusIcon('failed')}
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {latestBackup?.tables_verified}/{latestBackup?.total_tables} tables verified
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {alerts && alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Active Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getSeverityColor(alert.severity)}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(alert.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="font-medium">{alert.message}</p>
                    {alert.metadata?.issues && alert.metadata.issues.length > 0 && (
                      <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                        {alert.metadata.issues.slice(0, 3).map((issue: string, i: number) => (
                          <li key={i}>• {issue}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => acknowledgeAlert(alert.id)}
                  >
                    Acknowledge
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Backup Verifications */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Backup Verifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentBackups?.map((backup) => (
              <div
                key={backup.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(backup.verification_status)}
                  <div>
                    <p className="font-medium">
                      {new Date(backup.timestamp).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {backup.tables_verified}/{backup.total_tables} tables • {backup.verification_duration_ms}ms
                    </p>
                  </div>
                </div>
                <Badge variant={backup.verification_status === 'success' ? 'default' : 'secondary'}>
                  {backup.verification_status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

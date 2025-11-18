import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Clock, Database, Shield, AlertTriangle, FileText, TestTube } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface BackupVerificationLog {
  id: string;
  timestamp: string;
  backup_id: string;
  verification_status: 'success' | 'failed' | 'partial';
  tables_verified: number;
  total_tables: number;
  verification_duration_ms: number;
  issues: string[];
  tier_results?: Record<string, { verified: number; total: number; duration_ms: number }>;
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

interface PITRTestLog {
  id: string;
  test_id: string;
  timestamp: string;
  target_recovery_time: string;
  test_status: 'success' | 'failed';
  recovery_accuracy: number;
  duration_seconds: number;
  data_loss_detected: boolean;
  notes: string[];
}

export const DisasterRecoveryDashboard = () => {
  const navigate = useNavigate();
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

  // Fetch PITR test results
  const { data: pitrTests } = useQuery({
    queryKey: ['pitr-tests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pitr_test_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as PITRTestLog[];
    },
    refetchInterval: 60000
  });

  // Get latest PITR test
  const latestPitrTest = pitrTests?.[0];

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
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error('Manual verification failed:', error);
      toast.error('Failed to run backup verification');
    }
  };

  const runManualPitrTest = async () => {
    try {
      toast.info('Running manual PITR test...');
      const { data, error } = await supabase.functions.invoke('test-pitr-recovery');
      
      if (error) throw error;
      
      toast.success('PITR test completed successfully');
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error('Manual PITR test failed:', error);
      toast.error('Failed to run PITR test');
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
            Backup verification, PITR testing, and platform health monitoring
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => navigate('/admin/dr-runbooks')}
          >
            <FileText className="h-4 w-4 mr-2" />
            DR Runbooks
          </Button>
          <Button variant="outline" onClick={runManualPitrTest}>
            <TestTube className="h-4 w-4 mr-2" />
            Test PITR
          </Button>
          <Button onClick={runManualVerification}>
            <Database className="h-4 w-4 mr-2" />
            Verify Backups
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              {latestBackup?.tables_verified}/{latestBackup?.total_tables} tables verified ({latestBackup && latestBackup.total_tables > 0 ? ((latestBackup.tables_verified / latestBackup.total_tables) * 100).toFixed(1) : '0'}% coverage)
            </p>
          </CardContent>
        </Card>

        {/* PITR Test Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PITR Test Status</CardTitle>
            <TestTube className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {latestPitrTest?.test_status === 'success' ? (
                <>
                  Passing {getStatusIcon('success')}
                </>
              ) : latestPitrTest?.test_status === 'failed' ? (
                <>
                  Failed {getStatusIcon('failed')}
                </>
              ) : (
                <>
                  No Data
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {latestPitrTest ? (
                <>Last tested {new Date(latestPitrTest.timestamp).toLocaleDateString()}</>
              ) : (
                <>No tests run yet</>
              )}
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

      {/* Tier-Based Verification Breakdown */}
      {latestBackup?.tier_results && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Backup Verification by Tier</CardTitle>
            <p className="text-sm text-muted-foreground">
              Latest verification: {new Date(latestBackup.timestamp).toLocaleString()}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(latestBackup.tier_results).map(([tier, stats]) => {
                const successRate = (stats.verified / stats.total) * 100;
                return (
                  <div key={tier} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {successRate === 100 ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : successRate >= 90 ? (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="font-medium">{tier}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          {stats.verified}/{stats.total} tables
                        </span>
                        <Badge variant={
                          successRate === 100 ? 'default' :
                          successRate >= 90 ? 'secondary' : 'destructive'
                        }>
                          {successRate.toFixed(0)}%
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {stats.duration_ms}ms
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          successRate === 100 ? 'bg-green-500' :
                          successRate >= 90 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${successRate}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Coverage</span>
                <span className="font-medium">
                  {latestBackup.tables_verified}/{latestBackup.total_tables} tables ({((latestBackup.tables_verified / latestBackup.total_tables) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Backup Verifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Backup Verifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentBackups?.slice(0, 5).map((backup) => (
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

        {/* PITR Test Results */}
        <Card>
          <CardHeader>
            <CardTitle>Recent PITR Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pitrTests?.slice(0, 5).map((test) => (
                <div
                  key={test.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(test.test_status === 'success' ? 'success' : 'failed')}
                    <div>
                      <p className="font-medium">
                        {new Date(test.timestamp).toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Accuracy: {test.recovery_accuracy}% • {test.duration_seconds}s
                      </p>
                    </div>
                  </div>
                  <Badge variant={test.test_status === 'success' ? 'default' : 'destructive'}>
                    {test.test_status}
                  </Badge>
                </div>
              ))}
              {(!pitrTests || pitrTests.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <TestTube className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No PITR tests run yet</p>
                  <p className="text-sm">Click "Test PITR" to run your first test</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

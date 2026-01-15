import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle2, Clock, Database, Shield, AlertTriangle, FileText, TestTube, Activity, Network, TrendingUp, Users, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

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

const runbooksMarkdown = `# 🚨 Disaster Recovery Runbooks

## **Incident Classification**

| **Severity** | **Description** | **RTO** | **Response Team** |
|--------------|----------------|---------|-------------------|
| **P1 - Critical** | Complete platform outage | 4 hours | CTO + DevOps + Lead Strategist |
| **P2 - High** | Partial service degradation | 8 hours | DevOps + On-call Engineer |
| **P3 - Medium** | Non-critical service down | 24 hours | On-call Engineer |
| **P4 - Low** | Minor issues, no user impact | 72 hours | Engineering Team |

---

## **Runbook 1: Complete Database Failure**

### **Symptoms:**
- All database queries failing
- Lovable Cloud dashboard unreachable
- Health checks returning 500 errors
- Users unable to login or access any data

### **Immediate Actions (0-15 minutes):**

1. **Verify Outage Scope** - Test database connectivity
2. **Check Platform Status** - Review backup logs at /admin/disaster-recovery
3. **Activate Incident Response** - Post to #incidents channel
4. **Enable Maintenance Mode** - Update status page

### **Recovery Actions (15-60 minutes):**

5. **Check Last Known Good State** - Review backup verification logs
6. **Contact Lovable Support** - Open critical support ticket
7. **Verify Critical Tables Post-Recovery** - Check row counts
8. **Test Core Flows** - Login, profiles, applications, meetings, bookings

### **Post-Recovery (60-120 minutes):**

9. **Data Integrity Check** - Run manual backup verification
10. **Notify Stakeholders** - Email incident report
11. **Document Incident** - Create post-mortem

---

## **Runbook 2: Data Corruption Detected**

### **Symptoms:**
- Incorrect data returned
- Foreign key violations
- Backup verification failures
- PITR tests failing

### **Recovery:**

1. **Isolate Affected Tables** - Check verification logs
2. **Enable Read-Only Mode** - Prevent further corruption
3. **Identify Last Known Good State** - Find last successful backup
4. **Contact Lovable Support for PITR** - Request Point-in-Time Recovery
5. **Validate Restored Data** - Verify row counts and integrity
6. **Reconcile Recent Transactions** - Review audit logs

---

## **Runbook 3: Edge Function Failure**

### **Symptoms:**
- AI features not responding
- Webhooks timing out
- API calls returning 500 errors

### **Recovery:**

1. **Identify Failed Function** - Check edge function logs
2. **Check Recent Deployments** - Review git history
3. **Rollback to Previous Version** - Use git checkout
4. **Redeploy Function** - Auto-deploy on push
5. **Verify Function Health** - Test endpoint

---

## **Runbook 4: Backup Verification Failure**

### **Symptoms:**
- Backup verification showing failed status
- Platform alerts for backup failures

### **Recovery:**

1. **Check Alert Details** - View platform_alerts table
2. **Run Manual Verification** - Via /admin/disaster-recovery
3. **Identify Failed Tables** - Review error messages
4. **Contact Lovable Support** - If infrastructure issue

---

## **Runbook 5: PITR Test Failure**

### **Symptoms:**
- PITR test logs showing failed status
- Critical alerts
- Recovery accuracy below 100%

### **Recovery:**

1. **Review Test Results** - Check pitr_test_logs
2. **Run Manual PITR Test** - Via dashboard
3. **Contact Lovable Support** - Report failures
4. **Increase Test Frequency** - Monitor for patterns

---

## **Recovery Time Tracking**

| **Phase** | **Target Time** | **Responsible** |
|-----------|----------------|-----------------|
| Detection | 0-5 min | Automated monitoring |
| Assessment | 5-15 min | On-call engineer |
| Stakeholder notification | 15-20 min | CTO |
| Recovery initiation | 20-60 min | DevOps + Lovable Support |
| Verification | 60-90 min | QA + DevOps |
| Postmortem | 90-240 min | Full team |

---

## **Communication Templates**

### **Initial Incident Notification**
\`\`\`
Subject: [P1 INCIDENT] Platform Database Outage

Team,

We are experiencing a critical platform outage affecting all users.

Status: INVESTIGATING
Impact: All database operations failing
ETA: Investigating, updates every 15 minutes
Action: Recovery in progress

Next update: [TIME + 15 min]
\`\`\`

### **Resolution Notification**
\`\`\`
Subject: [RESOLVED] Platform Database Outage

Team,

The platform has been restored and all services are operational.

Duration: [X minutes]
Root Cause: [Brief description]
Data Loss: [None / X minutes]
Action Taken: [Brief description]

Full post-mortem: [Link]
\`\`\`

---

## **Post-Incident Requirements**

### **Within 24 Hours:**
- [ ] Incident timeline documented
- [ ] Root cause identified
- [ ] Customer communication sent
- [ ] Team debrief scheduled

### **Within 72 Hours:**
- [ ] Post-mortem document published
- [ ] Action items assigned
- [ ] Prevention measures identified
- [ ] Monitoring improvements implemented

### **Within 1 Week:**
- [ ] Runbook updates completed
- [ ] Team training conducted
- [ ] Similar risks assessed
- [ ] Customer follow-up calls completed
`;

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
    refetchInterval: 60000
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

  // ComprehensiveDR queries
  const { data: drillSchedule } = useQuery({
    queryKey: ['dr-drills'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dr_drill_schedule')
        .select('*')
        .order('scheduled_for', { ascending: true })
        .limit(5);
      if (error) throw error;
      return data;
    }
  });

  const { data: recentIncidents } = useQuery({
    queryKey: ['recent-incidents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incident_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    }
  });

  const { data: recoveryMetrics } = useQuery({
    queryKey: ['recovery-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recovery_metrics')
        .select('*')
        .order('metric_date', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    }
  });

  const { data: playbooks } = useQuery({
    queryKey: ['recovery-playbooks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recovery_playbooks')
        .select('*')
        .eq('is_active', true)
        .order('scenario_type');
      if (error) throw error;
      return data;
    }
  });

  const { data: serviceDeps } = useQuery({
    queryKey: ['service-dependencies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_dependencies')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  const { data: drContacts } = useQuery({
    queryKey: ['dr-contacts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dr_contacts')
        .select('*')
        .eq('is_active', true)
        .order('escalation_level');
      if (error) throw error;
      return data;
    }
  });

  // Get latest PITR test
  const latestPitrTest = pitrTests?.[0];

  // Calculate RPO (time since last verified backup)
  const rpoMinutes = latestBackup
    ? Math.floor((Date.now() - new Date(latestBackup.timestamp).getTime()) / 60000)
    : null;

  // Calculate metrics from ComprehensiveDR
  const avgRTO = recoveryMetrics?.length
    ? Math.round(recoveryMetrics.reduce((sum, m) => sum + (m.actual_rto_minutes || 0), 0) / recoveryMetrics.length)
    : 0;

  const avgRPO = recoveryMetrics?.length
    ? Math.round(recoveryMetrics.reduce((sum, m) => sum + (m.actual_rpo_minutes || 0), 0) / recoveryMetrics.length)
    : 0;

  const successRate = recoveryMetrics?.length
    ? Math.round((recoveryMetrics.filter(m => m.recovery_success).length / recoveryMetrics.length) * 100)
    : 0;

  const runManualVerification = async () => {
    try {
      toast.info('Running manual backup verification...');
      const { data, error } = await supabase.functions.invoke('verify-database-backups');

      if (error) throw error;

      toast.success('Backup verification completed successfully');
      setTimeout(() => window.location.reload(), 2000);
    } catch (error: any) {
      console.error('Manual verification failed:', error);
      toast.error(`Verification Failed: ${error.message || 'Unknown error'}. Check console/network logs.`);
    }
  };

  const runManualPitrTest = async () => {
    try {
      toast.info('Running manual PITR test...');
      const { data, error } = await supabase.functions.invoke('test-pitr-recovery');

      if (error) throw error;

      toast.success('PITR test completed successfully');
      setTimeout(() => window.location.reload(), 2000);
    } catch (error: any) {
      console.error('Manual PITR test failed:', error);
      toast.error(`PITR Test Failed: ${error.message || 'Unknown error'}. Check console/network logs.`);
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

  const downloadRunbooks = () => {
    const blob = new Blob([runbooksMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'DR_RUNBOOKS.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
          <h2 className="text-3xl font-bold">Disaster Recovery Command Center</h2>
          <p className="text-muted-foreground mt-1">
            Comprehensive backup verification, PITR testing, and incident management
          </p>
        </div>
        <div className="flex gap-2">
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

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        {/* RTO Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RTO Target</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4 hours</div>
            <p className="text-xs text-muted-foreground mt-1">
              Max downtime
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
              Target: ≤6 hours
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
                <>Healthy {getStatusIcon('success')}</>
              ) : latestBackup?.verification_status === 'partial' ? (
                <>Partial {getStatusIcon('partial')}</>
              ) : (
                <>Failed {getStatusIcon('failed')}</>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {latestBackup?.tables_verified}/{latestBackup?.total_tables} tables
            </p>
          </CardContent>
        </Card>

        {/* PITR Test Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PITR Status</CardTitle>
            <TestTube className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {latestPitrTest?.test_status === 'success' ? (
                <>Passing {getStatusIcon('success')}</>
              ) : latestPitrTest?.test_status === 'failed' ? (
                <>Failed {getStatusIcon('failed')}</>
              ) : (
                <>No Data</>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {latestPitrTest ? `Last: ${new Date(latestPitrTest.timestamp).toLocaleDateString()}` : 'No tests'}
            </p>
          </CardContent>
        </Card>

        {/* Recovery Success Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Last 10 recoveries
            </p>
          </CardContent>
        </Card>

        {/* Active Playbooks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Playbooks</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{playbooks?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Ready to execute
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

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="backups">Backup History</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="drills">DR Drills</TabsTrigger>
          <TabsTrigger value="playbooks">Playbooks</TabsTrigger>
          <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="runbooks">Runbooks</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Tier-Based Verification Breakdown */}
          {latestBackup?.tier_results && (
            <Card>
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
                            className={`h-2 rounded-full transition-all ${successRate === 100 ? 'bg-green-500' :
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
        </TabsContent>

        {/* Backup History Tab */}
        <TabsContent value="backups" className="space-y-4">
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
        </TabsContent>

        {/* Incidents Tab */}
        <TabsContent value="incidents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Incidents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentIncidents?.map((incident) => (
                  <div
                    key={incident.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      {incident.severity === 'critical' ? (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      ) : incident.severity === 'error' ? (
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                      ) : (
                        <Activity className="h-4 w-4 text-amber-500" />
                      )}
                      <div>
                        <p className="font-medium">{incident.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(incident.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant={incident.status === 'resolved' ? 'default' : 'destructive'}>
                      {incident.status}
                    </Badge>
                  </div>
                ))}
                {!recentIncidents || recentIncidents.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No recent incidents</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DR Drills Tab */}
        <TabsContent value="drills" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled DR Drills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {drillSchedule?.map((drill) => (
                  <div
                    key={drill.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{drill.drill_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(drill.scheduled_for).toLocaleString()} • {drill.duration_hours}h
                      </p>
                    </div>
                    <Badge>{drill.drill_type}</Badge>
                  </div>
                ))}
                {!drillSchedule || drillSchedule.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No scheduled drills</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Playbooks Tab */}
        <TabsContent value="playbooks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recovery Playbooks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {playbooks?.map((playbook) => (
                  <div
                    key={playbook.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{playbook.playbook_name}</h3>
                      <Badge variant={
                        playbook.severity_level === 'critical' ? 'destructive' : 'secondary'
                      }>
                        {playbook.severity_level}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {playbook.scenario_type.replace(/_/g, ' ')}
                    </p>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>RTO: {playbook.estimated_rto_minutes}m</span>
                      <span>RPO: {playbook.estimated_rpo_minutes}m</span>
                      <span>v{playbook.version}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dependencies Tab */}
        <TabsContent value="dependencies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Dependencies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {serviceDeps?.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Network className="h-4 w-4" />
                      <div>
                        <p className="font-medium">{service.service_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {service.service_type} • MTTR: {service.mttr_minutes}m
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={
                        service.criticality === 'critical' ? 'destructive' : 'secondary'
                      }>
                        {service.criticality}
                      </Badge>
                      <Badge variant="outline">{service.dependency_type}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>DR Contact List</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {drContacts?.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4" />
                      <div>
                        <p className="font-medium">{contact.contact_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {contact.email} {contact.phone && `• ${contact.phone}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge>L{contact.escalation_level}</Badge>
                      <Badge variant="outline">{contact.role}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Runbooks Tab */}
        <TabsContent value="runbooks" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-primary" />
                <CardTitle>Disaster Recovery Runbooks</CardTitle>
              </div>
              <Button variant="outline" onClick={downloadRunbooks}>
                <Download className="h-4 w-4 mr-2" />
                Download Runbooks
              </Button>
            </CardHeader>
            <CardContent>
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <ReactMarkdown
                  components={{
                    h2: ({ children }) => (
                      <h2 className="text-2xl font-bold mt-8 mb-4 pb-2 border-b">{children}</h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-xl font-semibold mt-6 mb-3">{children}</h3>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-6">
                        <table className="min-w-full border-collapse border border-border">
                          {children}
                        </table>
                      </div>
                    ),
                    th: ({ children }) => (
                      <th className="border border-border bg-muted px-4 py-2 text-left font-semibold">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="border border-border px-4 py-2">{children}</td>
                    ),
                    code: ({ children, className }) => {
                      const isInline = !className;
                      return isInline ? (
                        <code className="bg-muted px-1.5 py-0.5 rounded text-sm">
                          {children}
                        </code>
                      ) : (
                        <code className={className}>{children}</code>
                      );
                    },
                    pre: ({ children }) => (
                      <pre className="bg-muted p-4 rounded-lg overflow-x-auto my-4">
                        {children}
                      </pre>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside space-y-2 my-4">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside space-y-2 my-4">{children}</ol>
                    ),
                    hr: () => <hr className="my-8 border-border" />,
                  }}
                >
                  {runbooksMarkdown}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

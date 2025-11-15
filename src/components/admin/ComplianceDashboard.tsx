import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Activity, AlertTriangle, FileText, Clock, Database } from 'lucide-react';
import { AuditLogsTable } from './compliance/AuditLogsTable';
import { SecurityIncidentsPanel } from './compliance/SecurityIncidentsPanel';
import { DataRetentionPanel } from './compliance/DataRetentionPanel';
import { ComplianceMetrics } from './compliance/ComplianceMetrics';

export const ComplianceDashboard = () => {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security & Compliance</h1>
          <p className="text-muted-foreground">
            SOC 2 compliant audit trails, security monitoring, and data governance
          </p>
        </div>
        <Shield className="h-12 w-12 text-primary" />
      </div>

      <ComplianceMetrics />

      <Tabs defaultValue="audit-logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="audit-logs" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="security-incidents" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Security Incidents
          </TabsTrigger>
          <TabsTrigger value="data-retention" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data Retention
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Compliance Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="audit-logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Comprehensive Audit Trail</CardTitle>
              <CardDescription>
                SOC 2 compliant logging of all system events, data access, and modifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AuditLogsTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security-incidents" className="space-y-4">
          <SecurityIncidentsPanel />
        </TabsContent>

        <TabsContent value="data-retention" className="space-y-4">
          <DataRetentionPanel />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Reports</CardTitle>
              <CardDescription>
                Generate reports for SOC 2, GDPR, and CCPA compliance audits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">SOC 2 Audit Report (Last 90 Days)</p>
                      <p className="text-sm text-muted-foreground">
                        Comprehensive audit trail for external auditors
                      </p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                    Generate Report
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">GDPR Compliance Report</p>
                      <p className="text-sm text-muted-foreground">
                        Data processing activities and consent tracking
                      </p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                    Generate Report
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Data Retention Compliance</p>
                      <p className="text-sm text-muted-foreground">
                        Status of scheduled deletions and retention policies
                      </p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                    Generate Report
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

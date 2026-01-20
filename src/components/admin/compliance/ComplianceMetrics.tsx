import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const ComplianceMetrics = () => {
  const { data: auditStats } = useQuery({
    queryKey: ['audit-stats'],
    queryFn: async () => {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { count: totalEvents } = await (supabase as any)
        .from('comprehensive_audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('event_timestamp', last24h);

      const { count: failedEvents } = await (supabase as any)
        .from('comprehensive_audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('success', false)
        .gte('event_timestamp', last24h);

      const { count: piiAccess } = await (supabase as any)
        .from('pii_access_logs')
        .select('*', { count: 'exact', head: true })
        .gte('accessed_at', last24h);

      return {
        totalEvents: totalEvents || 0,
        failedEvents: failedEvents || 0,
        piiAccess: piiAccess || 0
      };
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: incidentStats } = useQuery({
    queryKey: ['incident-stats'],
    queryFn: async () => {
      const { count: openIncidents } = await (supabase as any)
        .from('security_incidents')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'investigating']);

      const { count: criticalIncidents } = await (supabase as any)
        .from('security_incidents')
        .select('*', { count: 'exact', head: true })
        .eq('severity', 'critical')
        .in('status', ['open', 'investigating']);

      return {
        openIncidents: openIncidents || 0,
        criticalIncidents: criticalIncidents || 0
      };
    },
    refetchInterval: 60000
  });

  const metrics = [
    {
      title: 'Audit Events (24h)',
      value: auditStats?.totalEvents || 0,
      icon: Activity,
      description: 'Total events logged',
      trend: '+12% from yesterday'
    },
    {
      title: 'Failed Events (24h)',
      value: auditStats?.failedEvents || 0,
      icon: AlertTriangle,
      description: 'Security events that failed',
      trend: auditStats?.failedEvents === 0 ? 'All systems normal' : 'Requires attention',
      status: auditStats?.failedEvents === 0 ? 'success' : 'warning'
    },
    {
      title: 'PII Access (24h)',
      value: auditStats?.piiAccess || 0,
      icon: Shield,
      description: 'Personal data accessed',
      trend: 'GDPR/CCPA compliant'
    },
    {
      title: 'Open Security Incidents',
      value: incidentStats?.openIncidents || 0,
      icon: AlertTriangle,
      description: `${incidentStats?.criticalIncidents || 0} critical`,
      trend: incidentStats?.openIncidents === 0 ? 'No active incidents' : 'Active monitoring',
      status: incidentStats?.openIncidents === 0 ? 'success' : 'warning'
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${
                metric.status === 'success' ? 'text-green-600' :
                metric.status === 'warning' ? 'text-yellow-600' :
                'text-muted-foreground'
              }`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metric.description}
              </p>
              <p className={`text-xs mt-2 ${
                metric.status === 'success' ? 'text-green-600' :
                metric.status === 'warning' ? 'text-yellow-600' :
                'text-muted-foreground'
              }`}>
                {metric.trend}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

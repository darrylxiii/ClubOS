import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, AlertTriangle, CheckCircle2, Clock, 
  FileText, Network, Shield, TrendingUp, Users, Zap 
} from 'lucide-react';

export const ComprehensiveDRDashboard = () => {
  // Fetch all DR metrics
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

  // Calculate metrics
  const avgRTO = recoveryMetrics?.length 
    ? Math.round(recoveryMetrics.reduce((sum, m) => sum + (m.actual_rto_minutes || 0), 0) / recoveryMetrics.length)
    : 0;

  const avgRPO = recoveryMetrics?.length
    ? Math.round(recoveryMetrics.reduce((sum, m) => sum + (m.actual_rpo_minutes || 0), 0) / recoveryMetrics.length)
    : 0;

  const successRate = recoveryMetrics?.length
    ? Math.round((recoveryMetrics.filter(m => m.recovery_success).length / recoveryMetrics.length) * 100)
    : 0;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-3xl font-bold">Enterprise DR Command Center</h2>
        <p className="text-muted-foreground mt-1">
          Comprehensive disaster recovery management and monitoring
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg RTO (Actual)</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgRTO} min</div>
            <p className="text-xs text-muted-foreground">
              Target: 240 min ({avgRTO <= 240 ? '✓' : '✗'})
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg RPO (Actual)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgRPO} min</div>
            <p className="text-xs text-muted-foreground">
              Target: 60 min ({avgRPO <= 60 ? '✓' : '✗'})
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recovery Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate}%</div>
            <p className="text-xs text-muted-foreground">
              Last 10 recoveries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Playbooks</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{playbooks?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Ready to execute
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="incidents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="drills">DR Drills</TabsTrigger>
          <TabsTrigger value="playbooks">Playbooks</TabsTrigger>
          <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
        </TabsList>

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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

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
      </Tabs>
    </div>
  );
};

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertTriangle, CheckCircle, Clock, Plus, Shield, AlertCircle, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface SecurityIncident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  incident_type: string;
  affected_systems: string[];
  reported_by: string;
  assigned_to: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

const severityColors = {
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
};

const statusColors = {
  open: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  investigating: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
};

export const SecurityIncidentsPanel = () => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<SecurityIncident | null>(null);
  const [newIncident, setNewIncident] = useState({
    title: '',
    description: '',
    severity: 'medium' as const,
    incident_type: 'security_breach',
    affected_systems: ''
  });

  const { data: incidents, isLoading } = useQuery({
    queryKey: ['security-incidents'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('security_incidents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as SecurityIncident[];
    },
    refetchInterval: 30000
  });

  const createIncidentMutation = useMutation({
    mutationFn: async (incident: typeof newIncident) => {
      const user = await supabase.auth.getUser();
      const { error } = await (supabase as any)
        .from('security_incidents')
        .insert({
          title: incident.title,
          description: incident.description,
          severity: incident.severity,
          incident_type: incident.incident_type,
          affected_systems: incident.affected_systems.split(',').map((s: string) => s.trim()).filter(Boolean),
          reported_by: user.data.user?.id,
          status: 'open'
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-incidents'] });
      setIsCreateOpen(false);
      setNewIncident({ title: '', description: '', severity: 'medium', incident_type: 'security_breach', affected_systems: '' });
      toast.success('Security incident reported');
    },
    onError: () => toast.error('Failed to create incident')
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, resolution_notes }: { id: string; status: string; resolution_notes?: string }) => {
      const updateData: any = { 
        status,
        updated_at: new Date().toISOString()
      };
      if (status === 'resolved' || status === 'closed') {
        updateData.resolved_at = new Date().toISOString();
        if (resolution_notes) updateData.resolution_notes = resolution_notes;
      }
      const { error } = await (supabase as any)
        .from('security_incidents')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-incidents'] });
      setSelectedIncident(null);
      toast.success('Incident updated');
    },
    onError: () => toast.error('Failed to update incident')
  });

  const openIncidents = incidents?.filter(i => i.status === 'open' || i.status === 'investigating') || [];
  const criticalCount = openIncidents.filter(i => i.severity === 'critical').length;

  if (isLoading) {
    return <div className="p-4">Loading security incidents...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Incidents</p>
                <p className="text-3xl font-bold">{openIncidents.length}</p>
              </div>
              <AlertTriangle className={`h-8 w-8 ${openIncidents.length > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-3xl font-bold text-red-600">{criticalCount}</p>
              </div>
              <AlertCircle className={`h-8 w-8 ${criticalCount > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Investigating</p>
                <p className="text-3xl font-bold">{incidents?.filter(i => i.status === 'investigating').length || 0}</p>
              </div>
              <Eye className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolved (30d)</p>
                <p className="text-3xl font-bold text-green-600">{incidents?.filter(i => i.status === 'resolved' || i.status === 'closed').length || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Incidents Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Incidents
            </CardTitle>
            <CardDescription>
              Track and manage security incidents for SOC 2 compliance
            </CardDescription>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Report Incident
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Report Security Incident</DialogTitle>
                <DialogDescription>Document a new security incident for tracking and resolution.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={newIncident.title}
                    onChange={(e) => setNewIncident(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Brief incident title"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={newIncident.description}
                    onChange={(e) => setNewIncident(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Detailed description of the incident"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Severity</label>
                    <Select value={newIncident.severity} onValueChange={(v: any) => setNewIncident(prev => ({ ...prev, severity: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Type</label>
                    <Select value={newIncident.incident_type} onValueChange={(v) => setNewIncident(prev => ({ ...prev, incident_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="security_breach">Security Breach</SelectItem>
                        <SelectItem value="data_leak">Data Leak</SelectItem>
                        <SelectItem value="unauthorized_access">Unauthorized Access</SelectItem>
                        <SelectItem value="malware">Malware</SelectItem>
                        <SelectItem value="phishing">Phishing</SelectItem>
                        <SelectItem value="policy_violation">Policy Violation</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Affected Systems (comma-separated)</label>
                  <Input
                    value={newIncident.affected_systems}
                    onChange={(e) => setNewIncident(prev => ({ ...prev, affected_systems: e.target.value }))}
                    placeholder="e.g., auth, database, api"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button onClick={() => createIncidentMutation.mutate(newIncident)} disabled={!newIncident.title}>
                  Report Incident
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {incidents && incidents.length > 0 ? (
            <div className="space-y-3">
              {incidents.map((incident) => (
                <div
                  key={incident.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedIncident(incident)}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`p-2 rounded-full ${severityColors[incident.severity]}`}>
                      {incident.severity === 'critical' ? <AlertCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{incident.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">{incident.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={severityColors[incident.severity]}>{incident.severity}</Badge>
                    <Badge className={statusColors[incident.status]}>{incident.status}</Badge>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(incident.created_at), 'MMM d, HH:mm')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                <p className="text-lg font-medium">No Active Security Incidents</p>
                <p className="text-sm mt-2">All systems are operating normally</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Incident Detail Dialog */}
      <Dialog open={!!selectedIncident} onOpenChange={() => setSelectedIncident(null)}>
        <DialogContent className="max-w-2xl">
          {selectedIncident && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Badge className={severityColors[selectedIncident.severity]}>{selectedIncident.severity}</Badge>
                  {selectedIncident.title}
                </DialogTitle>
                <DialogDescription>
                  Reported {format(new Date(selectedIncident.created_at), 'MMMM d, yyyy HH:mm')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="mt-1">{selectedIncident.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Type</label>
                    <p className="mt-1">{selectedIncident.incident_type.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <Badge className={`mt-1 ${statusColors[selectedIncident.status]}`}>{selectedIncident.status}</Badge>
                  </div>
                </div>
                {selectedIncident.affected_systems?.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Affected Systems</label>
                    <div className="flex gap-2 mt-1">
                      {selectedIncident.affected_systems.map((sys, i) => (
                        <Badge key={i} variant="outline">{sys}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {selectedIncident.resolution_notes && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Resolution Notes</label>
                    <p className="mt-1">{selectedIncident.resolution_notes}</p>
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2">
                {selectedIncident.status === 'open' && (
                  <Button variant="outline" onClick={() => updateStatusMutation.mutate({ id: selectedIncident.id, status: 'investigating' })}>
                    Start Investigation
                  </Button>
                )}
                {selectedIncident.status === 'investigating' && (
                  <Button onClick={() => updateStatusMutation.mutate({ id: selectedIncident.id, status: 'resolved', resolution_notes: 'Resolved via dashboard' })}>
                    Mark Resolved
                  </Button>
                )}
                {selectedIncident.status === 'resolved' && (
                  <Button variant="outline" onClick={() => updateStatusMutation.mutate({ id: selectedIncident.id, status: 'closed' })}>
                    Close Incident
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

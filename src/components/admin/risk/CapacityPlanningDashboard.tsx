import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Server, Database, Users, Zap, TrendingUp, AlertTriangle, Plus, Trash2, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CapacityMetric {
  id: string;
  metric_name: string;
  current_value: number;
  max_value: number;
  unit: string;
  trend_percentage: number;
  status: string;
}

interface ScalingTrigger {
  id: string;
  metric: string;
  threshold: string;
  action: string;
  status: string;
}

const growthProjections = [
  { period: 'Q1 2026', users: 2500, revenue: '€125K', hires: 15 },
  { period: 'Q2 2026', users: 4000, revenue: '€200K', hires: 25 },
  { period: 'Q3 2026', users: 6500, revenue: '€325K', hires: 40 },
  { period: 'Q4 2026', users: 10000, revenue: '€500K', hires: 60 },
];

const metricIcons: Record<string, typeof Database> = {
  'Database Connections': Database,
  'API Rate Limit': Zap,
  'Active Users': Users,
  'Storage Usage': Server,
  'Memory Usage': Server,
};

export function CapacityPlanningDashboard() {
  const queryClient = useQueryClient();
  const [isAddTriggerOpen, setIsAddTriggerOpen] = useState(false);
  const [newTrigger, setNewTrigger] = useState({ metric: '', threshold: '', action: '' });

  // Fetch capacity metrics
  const { data: capacityMetrics = [], isLoading: metricsLoading } = useQuery({
    queryKey: ['capacity-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('capacity_metrics')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as CapacityMetric[];
    },
  });

  // Fetch scaling triggers
  const { data: scalingTriggers = [], isLoading: triggersLoading } = useQuery({
    queryKey: ['scaling-triggers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scaling_triggers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ScalingTrigger[];
    },
  });

  // Create trigger mutation
  const createTriggerMutation = useMutation({
    mutationFn: async (trigger: typeof newTrigger) => {
      const { error } = await supabase.from('scaling_triggers').insert({
        metric: trigger.metric,
        threshold: trigger.threshold,
        action: trigger.action,
        status: 'active',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scaling-triggers'] });
      toast.success('Scaling trigger added');
      setIsAddTriggerOpen(false);
      setNewTrigger({ metric: '', threshold: '', action: '' });
    },
    onError: (error) => toast.error('Failed to add trigger: ' + error.message),
  });

  // Update trigger status mutation
  const updateTriggerMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('scaling_triggers')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scaling-triggers'] });
      toast.success('Trigger updated');
    },
  });

  // Delete trigger mutation
  const deleteTriggerMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('scaling_triggers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scaling-triggers'] });
      toast.success('Trigger deleted');
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500/10 text-green-500';
      case 'warning': return 'bg-yellow-500/10 text-yellow-500';
      case 'critical': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (metricsLoading || triggersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Capacity */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {capacityMetrics.map((metric) => {
          const Icon = metricIcons[metric.metric_name] || Server;
          const percentage = (metric.current_value / metric.max_value) * 100;
          
          return (
            <Card key={metric.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <Badge className={getStatusColor(metric.status)}>
                    {metric.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{metric.metric_name}</p>
                <p className="text-2xl font-bold">
                  {metric.current_value.toLocaleString()}{' '}
                  <span className="text-sm font-normal text-muted-foreground">
                    / {metric.max_value.toLocaleString()} {metric.unit}
                  </span>
                </p>
                <Progress value={percentage} className="mt-2" />
                <div className="flex items-center mt-2 text-xs text-muted-foreground">
                  <TrendingUp className={`h-3 w-3 mr-1 ${metric.trend_percentage >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                  {metric.trend_percentage >= 0 ? '+' : ''}{metric.trend_percentage}% this month
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth Projections */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Growth Projections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {growthProjections.map((proj) => (
                <div key={proj.period} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{proj.period}</p>
                    <p className="text-sm text-muted-foreground">
                      {proj.users.toLocaleString()} users • {proj.hires} hires
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">{proj.revenue}</p>
                    <p className="text-xs text-muted-foreground">MRR target</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Auto-Scaling Triggers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Auto-Scaling Triggers
              </div>
              <Dialog open={isAddTriggerOpen} onOpenChange={setIsAddTriggerOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Scaling Trigger</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Metric</Label>
                      <Input
                        placeholder="e.g., CPU Usage"
                        value={newTrigger.metric}
                        onChange={(e) => setNewTrigger({ ...newTrigger, metric: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Threshold</Label>
                      <Input
                        placeholder="e.g., >80%"
                        value={newTrigger.threshold}
                        onChange={(e) => setNewTrigger({ ...newTrigger, threshold: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Action</Label>
                      <Input
                        placeholder="e.g., Add 2 instances"
                        value={newTrigger.action}
                        onChange={(e) => setNewTrigger({ ...newTrigger, action: e.target.value })}
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => createTriggerMutation.mutate(newTrigger)}
                      disabled={!newTrigger.metric || !newTrigger.threshold || !newTrigger.action || createTriggerMutation.isPending}
                    >
                      {createTriggerMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Add Trigger
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scalingTriggers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No scaling triggers configured yet.
                </p>
              ) : (
                scalingTriggers.map((trigger) => (
                  <div key={trigger.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1">
                      <p className="font-medium">{trigger.metric}</p>
                      <p className="text-sm text-muted-foreground">
                        Threshold: {trigger.threshold} → {trigger.action}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={trigger.status}
                        onValueChange={(status) => updateTriggerMutation.mutate({ id: trigger.id, status })}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="paused">Paused</SelectItem>
                          <SelectItem value="triggered">Triggered</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteTriggerMutation.mutate(trigger.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Capacity Alerts */}
      <Card className="border-yellow-500/50 bg-yellow-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-600">
            <AlertTriangle className="h-5 w-5" />
            Capacity Planning Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {capacityMetrics.filter(m => m.status === 'warning' || (m.current_value / m.max_value) > 0.7).map((m) => (
              <li key={m.id} className="flex items-start gap-2">
                <span className="text-yellow-600">•</span>
                <span>
                  {m.metric_name} at {Math.round((m.current_value / m.max_value) * 100)}% capacity - 
                  consider upgrading before it reaches critical levels
                </span>
              </li>
            ))}
            <li className="flex items-start gap-2">
              <span className="text-yellow-600">•</span>
              <span>User growth trending - prepare for 10x capacity by Q4</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

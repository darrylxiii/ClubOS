import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, TrendingUp, Brain, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export function PredictiveAnalyticsTab() {
  const { data: behaviorData, isLoading } = useQuery({
    queryKey: ['predictive-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_behavior_embeddings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000,
  });

  const { data: churnSignals } = useQuery({
    queryKey: ['churn-signals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('churn_signals' as any)
        .select('*')
        .eq('is_active', true)
        .order('risk_score', { ascending: false })
        .limit(20);
      
      if (error) return [];
      return data || [];
    },
    refetchInterval: 60000,
  });

  // Cluster distribution
  const clusterDistribution = behaviorData?.reduce((acc, user) => {
    const cluster = user.cluster_id || 'unassigned';
    const label = user.segment_label || 'Unknown';
    const key = `${cluster}-${label}`;
    
    if (!acc[key]) {
      acc[key] = { cluster, label, count: 0 };
    }
    acc[key].count++;
    return acc;
  }, {} as Record<string, any>);

  const clusterData = Object.values(clusterDistribution || {}).sort((a: any, b: any) => b.count - a.count);

  // Anomaly distribution
  const anomalyUsers = behaviorData?.filter(u => (u.anomaly_score || 0) > 0.7);

  const getRiskLevel = (score: number) => {
    if (score >= 0.8) return { label: 'Critical', color: 'destructive' };
    if (score >= 0.6) return { label: 'High', color: 'default' };
    if (score >= 0.4) return { label: 'Medium', color: 'secondary' };
    return { label: 'Low', color: 'outline' };
  };

  if (isLoading) {
    return <div className="p-6">Loading predictive analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">User Segments</CardTitle>
            <Brain className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clusterData.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Active clusters</p>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Churn Risks</CardTitle>
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{churnSignals?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Active signals</p>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Anomalies</CardTitle>
            <Target className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{anomalyUsers?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Unusual behavior</p>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Predictions</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{behaviorData?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Users analyzed</p>
          </CardContent>
        </Card>
      </div>

      {/* User Segments */}
      <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
        <CardHeader>
          <CardTitle>User Behavior Segments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {clusterData.map((cluster: any) => (
              <div key={`${cluster.cluster}-${cluster.label}`} className="p-4 rounded-lg bg-muted/20 border border-border/10">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-sm font-medium">{cluster.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">Cluster {cluster.cluster}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{cluster.count} users</span>
                </div>
                <Progress 
                  value={(cluster.count / (behaviorData?.length || 1)) * 100} 
                  className="h-2"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Churn Risk Users */}
      <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
        <CardHeader>
          <CardTitle>Churn Risk Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {churnSignals?.map((signal) => {
                const risk = getRiskLevel(signal.risk_score || 0);
                return (
                  <div key={signal.id} className="p-4 rounded-lg bg-muted/20 border border-border/10">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={risk.color as any}>{risk.label} Risk</Badge>
                          <span className="text-xs text-muted-foreground">
                            Score: {(signal.risk_score * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Signals:</span>
                          <div className="mt-1 space-y-1">
                            {signal.signal_reasons?.map((reason: string, i: number) => (
                              <div key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                                <span className="mt-0.5">•</span>
                                <span>{reason}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        {signal.recommended_action && (
                          <div className="text-xs bg-primary/10 text-primary p-2 rounded">
                            <span className="font-medium">Recommended:</span> {signal.recommended_action}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(signal.created_at), 'MMM dd')}
                      </span>
                    </div>
                  </div>
                );
              })}
              {(!churnSignals || churnSignals.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  No active churn signals detected
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Anomaly Detection */}
      <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
        <CardHeader>
          <CardTitle>Anomalous Behavior Detection</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {anomalyUsers?.map((user) => (
                <div key={user.id} className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-medium">Anomaly Score: {(user.anomaly_score * 100).toFixed(0)}%</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Segment: {user.segment_label || 'Unknown'}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(user.updated_at), 'MMM dd')}
                    </span>
                  </div>
                </div>
              ))}
              {(!anomalyUsers || anomalyUsers.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  No anomalies detected
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

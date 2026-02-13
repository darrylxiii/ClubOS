import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow, format } from 'date-fns';
import { Clock, Zap, AlertCircle, CheckCircle2, Timer, TrendingUp } from 'lucide-react';

interface HeartbeatLog {
  id: string;
  run_at: string;
  agents_invoked: string[];
  results: any;
  duration_ms: number | null;
  errors: any;
  events_processed: number | null;
  signals_detected: number | null;
  tasks_created: number | null;
}

export default function MissionControlView() {
  const [logs, setLogs] = useState<HeartbeatLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from('agentic_heartbeat_log')
        .select('*')
        .order('run_at', { ascending: false })
        .limit(50);

      if (!error && data) setLogs(data);
      setLoading(false);
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  const todayLogs = logs.filter(
    (l) => new Date(l.run_at).toDateString() === new Date().toDateString()
  );
  const avgDuration = todayLogs.length
    ? Math.round(todayLogs.reduce((s, l) => s + (l.duration_ms || 0), 0) / todayLogs.length)
    : 0;
  const errorCount = todayLogs.filter(
    (l) => l.errors && (Array.isArray(l.errors) ? l.errors.length > 0 : Object.keys(l.errors).length > 0)
  ).length;
  const errorRate = todayLogs.length ? Math.round((errorCount / todayLogs.length) * 100) : 0;
  const uniqueAgents = new Set(todayLogs.flatMap((l) => l.agents_invoked || []));

  const statCards = [
    { label: 'Runs Today', value: todayLogs.length, icon: Zap, color: 'text-primary' },
    { label: 'Avg Duration', value: `${avgDuration}ms`, icon: Timer, color: 'text-accent' },
    { label: 'Error Rate', value: `${errorRate}%`, icon: AlertCircle, color: errorRate > 10 ? 'text-destructive' : 'text-success' },
    { label: 'Agents Active', value: uniqueAgents.size, icon: TrendingUp, color: 'text-success' },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const hasErrors = (log: HeartbeatLog) => {
    if (!log.errors) return false;
    if (Array.isArray(log.errors)) return log.errors.length > 0;
    return Object.keys(log.errors).length > 0;
  };

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((stat) => (
          <Card key={stat.label} variant="static" className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</span>
            </div>
            <span className="text-2xl font-bold font-mono">{stat.value}</span>
          </Card>
        ))}
      </div>

      {/* Error Spotlight */}
      {logs.slice(0, 5).some(hasErrors) && (
        <Card variant="static" className="border-destructive/40 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Recent Errors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {logs
              .filter(hasErrors)
              .slice(0, 3)
              .map((log) => {
                const errors = Array.isArray(log.errors) ? log.errors : [];
                return (
                  <div key={log.id} className="text-sm p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                    <span className="text-muted-foreground text-xs">
                      {formatDistanceToNow(new Date(log.run_at), { addSuffix: true })}
                    </span>
                    {errors.map((e: any, i: number) => (
                      <p key={i} className="text-destructive mt-1">
                        <span className="font-medium">{e.agent}:</span> {e.error}
                      </p>
                    ))}
                  </div>
                );
              })}
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card variant="static">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
            Heartbeat Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No heartbeat runs yet. The system will start pulsing soon.</p>
          ) : (
            <div className="relative space-y-0">
              {/* Vertical line */}
              <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border/50" />
              
              {logs.map((log) => {
                const isExpanded = expandedId === log.id;
                const hasError = hasErrors(log);
                
                return (
                  <div
                    key={log.id}
                    className="relative pl-10 py-3 cursor-pointer group"
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  >
                    {/* Timeline dot */}
                    <div
                      className={`absolute left-[10px] top-[18px] h-3 w-3 rounded-full border-2 transition-colors ${
                        hasError
                          ? 'bg-destructive border-destructive/50'
                          : 'bg-success border-success/50 group-hover:border-success'
                      }`}
                    />

                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground w-28 shrink-0">
                        {format(new Date(log.run_at), 'HH:mm:ss')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.run_at), { addSuffix: true })}
                      </span>
                      {log.duration_ms && (
                        <Badge variant="secondary" className="text-xs font-mono">
                          {log.duration_ms}ms
                        </Badge>
                      )}
                      <Badge variant={hasError ? 'destructive' : 'default'} className="text-xs">
                        {hasError ? 'Error' : 'OK'}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {log.agents_invoked?.length || 0} agents
                      </span>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 p-3 rounded-lg bg-muted/30 border border-border/20 space-y-2">
                        <div className="flex flex-wrap gap-1">
                          {log.agents_invoked?.map((a) => (
                            <Badge key={a} variant="outline" className="text-xs">
                              {a}
                            </Badge>
                          ))}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Events:</span>{' '}
                            <span className="font-mono">{log.events_processed || 0}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Signals:</span>{' '}
                            <span className="font-mono">{log.signals_detected || 0}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Tasks:</span>{' '}
                            <span className="font-mono">{log.tasks_created || 0}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

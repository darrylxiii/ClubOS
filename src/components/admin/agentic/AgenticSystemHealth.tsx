import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Activity, Zap, Signal, CheckCircle2, AlertTriangle } from 'lucide-react';

interface HealthStats {
  lastRunAt: string | null;
  isHealthy: boolean;
  eventsProcessed24h: number;
  signalsActive: number;
  agentsOnline: number;
  tasksCreated24h: number;
}

export default function AgenticSystemHealth() {
  const [stats, setStats] = useState<HealthStats>({
    lastRunAt: null,
    isHealthy: false,
    eventsProcessed24h: 0,
    signalsActive: 0,
    agentsOnline: 0,
    tasksCreated24h: 0,
  });

  useEffect(() => {
    const fetchHealth = async () => {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      const [logsRes, signalsRes, agentsRes] = await Promise.all([
        supabase
          .from('agentic_heartbeat_log')
          .select('run_at, events_processed, tasks_created, signals_detected')
          .gte('run_at', twentyFourHoursAgo)
          .order('run_at', { ascending: false })
          .limit(100),
        supabase
          .from('predictive_signals')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true),
        supabase
          .from('agent_registry')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true),
      ]);

      const logs = logsRes.data || [];
      const lastRun = logs[0]?.run_at || null;
      const isHealthy = lastRun
        ? new Date(lastRun).getTime() > now.getTime() - 20 * 60 * 1000
        : false;

      const eventsProcessed = logs.reduce((sum: number, l: any) => sum + (l.events_processed || 0), 0);
      const tasksCreated = logs.reduce((sum: number, l: any) => sum + (l.tasks_created || 0), 0);

      setStats({
        lastRunAt: lastRun,
        isHealthy,
        eventsProcessed24h: eventsProcessed,
        signalsActive: signalsRes.count || 0,
        agentsOnline: agentsRes.count || 0,
        tasksCreated24h: tasksCreated,
      });
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const metrics = [
    {
      label: 'System Pulse',
      value: stats.isHealthy ? 'Online' : 'Stale',
      icon: Activity,
      color: stats.isHealthy ? 'text-success' : 'text-destructive',
      pulse: stats.isHealthy,
    },
    {
      label: 'Events (24h)',
      value: stats.eventsProcessed24h.toLocaleString(),
      icon: Zap,
      color: 'text-primary',
    },
    {
      label: 'Active Signals',
      value: stats.signalsActive.toString(),
      icon: Signal,
      color: 'text-warning',
    },
    {
      label: 'Agents Online',
      value: stats.agentsOnline.toString(),
      icon: CheckCircle2,
      color: 'text-success',
    },
    {
      label: 'Tasks Created (24h)',
      value: stats.tasksCreated24h.toString(),
      icon: AlertTriangle,
      color: 'text-accent',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="relative rounded-xl border border-border/30 bg-card/40 backdrop-blur-sm p-4 flex flex-col gap-2"
        >
          <div className="flex items-center gap-2">
            <div className={`relative ${metric.color}`}>
              <metric.icon className="h-4 w-4" />
              {metric.pulse && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-success animate-pulse" />
              )}
            </div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              {metric.label}
            </span>
          </div>
          <span className="text-xl font-bold font-mono tracking-tight text-foreground">
            {metric.value}
          </span>
        </div>
      ))}
    </div>
  );
}

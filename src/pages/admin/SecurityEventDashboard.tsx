import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { DynamicChart } from '@/components/charts/DynamicChart';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  user_id: string | null;
  ip_address: string | null;
  metadata: Record<string, any>;
  resolved_at: string | null;
  created_at: string;
}

const SEVERITY_COLORS = {
  critical: 'hsl(0, 84%, 60%)',
  high: 'hsl(25, 95%, 53%)',
  medium: 'hsl(45, 93%, 47%)',
  low: 'hsl(142, 76%, 36%)',
};

const SEVERITY_ICONS = {
  critical: AlertCircle,
  high: AlertTriangle,
  medium: Info,
  low: CheckCircle,
};

export default function SecurityEventDashboard() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [stats, setStats] = useState({
    total: 0, critical: 0, high: 0, medium: 0, low: 0, unresolved: 0,
  });

  useEffect(() => { loadSecurityEvents(); }, []);

  const loadSecurityEvents = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('security_events').select('*').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      const eventData = data || [];
      setEvents(eventData);
      setStats({
        total: eventData.length,
        critical: eventData.filter((e: SecurityEvent) => e.severity === 'critical').length,
        high: eventData.filter((e: SecurityEvent) => e.severity === 'high').length,
        medium: eventData.filter((e: SecurityEvent) => e.severity === 'medium').length,
        low: eventData.filter((e: SecurityEvent) => e.severity === 'low').length,
        unresolved: eventData.filter((e: SecurityEvent) => !e.resolved_at).length,
      });
    } catch (error) {
      console.error('Error loading security events:', error);
    } finally { setLoading(false); }
  };

  const severityData = [
    { name: 'Critical', value: stats.critical },
    { name: 'High', value: stats.high },
    { name: 'Medium', value: stats.medium },
    { name: 'Low', value: stats.low },
  ].filter(s => s.value > 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Events</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card className="border-red-500/50"><CardContent className="pt-6"><p className="text-sm text-red-500">Critical</p><p className="text-2xl font-bold text-red-500">{stats.critical}</p></CardContent></Card>
        <Card className="border-orange-500/50"><CardContent className="pt-6"><p className="text-sm text-orange-500">High</p><p className="text-2xl font-bold text-orange-500">{stats.high}</p></CardContent></Card>
        <Card className="border-yellow-500/50"><CardContent className="pt-6"><p className="text-sm text-yellow-500">Medium</p><p className="text-2xl font-bold text-yellow-500">{stats.medium}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Unresolved</p><p className="text-2xl font-bold">{stats.unresolved}</p></CardContent></Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Severity Distribution</CardTitle></CardHeader>
          <CardContent>
            {severityData.length > 0 ? (
              <DynamicChart type="pie" data={severityData} height={250} config={{ pie: { dataKey: 'value', nameKey: 'name', outerRadius: 80, colors: [SEVERITY_COLORS.critical, SEVERITY_COLORS.high, SEVERITY_COLORS.medium, SEVERITY_COLORS.low] }, showTooltip: true }} />
            ) : (
              <div className="h-[250px] flex flex-col items-center justify-center text-center px-4">
                <Shield className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">All Clear</p>
                <p className="text-sm text-muted-foreground/70 mt-1">No security incidents detected.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent Events</CardTitle><CardDescription>Latest security incidents</CardDescription></CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px]">
              {events.length > 0 ? (
                <div className="space-y-3">
                  {events.slice(0, 10).map(event => {
                    const Icon = SEVERITY_ICONS[event.severity];
                    return (
                      <div key={event.id} className="flex items-start gap-3 p-2 border rounded-lg">
                        <Icon className="h-5 w-5 mt-0.5" style={{ color: SEVERITY_COLORS[event.severity] }} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{event.event_type}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(event.created_at), 'MMM d, HH:mm')}</p>
                        </div>
                        <Badge variant={event.resolved_at ? 'secondary' : 'destructive'}>{event.resolved_at ? 'Resolved' : 'Open'}</Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <CheckCircle className="h-10 w-10 text-green-500/50 mb-3" />
                  <p className="text-muted-foreground font-medium">No Incidents</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

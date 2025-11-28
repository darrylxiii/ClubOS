import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Monitor, Smartphone, Tablet, Globe, Clock } from "lucide-react";

export default function RealTimeActivityTab() {
  const { data: liveData } = useQuery({
    queryKey: ['realtime-activity'],
    queryFn: async () => {
      const fiveMinutesAgo = new Date(Date.now() - 300000).toISOString();
      
      const { data: sessions } = await supabase
        .from('user_page_analytics')
        .select('*')
        .gte('entry_timestamp', fiveMinutesAgo)
        .is('exit_timestamp', null);

      const { data: events } = await supabase
        .from('user_session_events')
        .select('*')
        .gte('event_timestamp', fiveMinutesAgo)
        .order('event_timestamp', { ascending: false })
        .limit(50);

      const deviceBreakdown = events?.reduce((acc: any, event: any) => {
        const device = event.metadata?.device_type || 'unknown';
        acc[device] = (acc[device] || 0) + 1;
        return acc;
      }, {});

      return {
        activeSessions: sessions || [],
        recentEvents: events || [],
        deviceBreakdown: deviceBreakdown || {}
      };
    },
    refetchInterval: 5000
  });

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-green-500" />
            Active Sessions
          </CardTitle>
          <CardDescription>Users currently browsing (last 5 minutes)</CardDescription>
        </CardHeader>
        <CardContent>
          {liveData?.activeSessions && liveData.activeSessions.length > 0 ? (
            <div className="space-y-3">
              {liveData.activeSessions.slice(0, 10).map((session: any) => (
                <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <div>
                      <p className="font-medium text-sm">{session.page_path}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(session.entry_timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {session.viewport_width}x{session.viewport_height}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active sessions</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-blue-500" />
            Device Breakdown
          </CardTitle>
          <CardDescription>Events by device type (last 5 minutes)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(liveData?.deviceBreakdown || {}).map(([device, count]) => (
              <div key={device} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getDeviceIcon(device)}
                  <span className="text-sm font-medium capitalize">{device}</span>
                </div>
                <Badge variant="outline">{count as number} events</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
          <CardDescription>Latest user interactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {liveData?.recentEvents && liveData.recentEvents.length > 0 ? (
              liveData.recentEvents.map((event: any) => (
                <div key={event.id} className="flex items-center justify-between p-2 border-b text-sm">
                  <div className="flex items-center gap-3 flex-1">
                    <Badge variant="secondary" className="text-xs">
                      {event.event_type}
                    </Badge>
                    <span className="text-muted-foreground truncate">{event.page_path}</span>
                    {event.element_id && (
                      <code className="text-xs bg-muted px-2 py-1 rounded">#{event.element_id}</code>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                    {new Date(event.event_timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No recent events</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

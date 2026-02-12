import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Monitor, Smartphone, Tablet, Globe, Clock, Users } from "lucide-react";

export default function RealTimeActivityTab() {
  const { data: liveData } = useQuery({
    queryKey: ['realtime-activity'],
    queryFn: async () => {
      const fiveMinutesAgo = new Date(Date.now() - 300000).toISOString();
      
      const [sessions, sessionEvents, legacyEvents, deviceInfo] = await Promise.all([
        supabase
          .from('user_page_analytics')
          .select('*, profiles:user_id(full_name, avatar_url)')
          .gte('entry_timestamp', fiveMinutesAgo)
          .is('exit_timestamp', null),
        supabase
          .from('user_session_events')
          .select('*, profiles:user_id(full_name, avatar_url)')
          .gte('event_timestamp', fiveMinutesAgo)
          .order('event_timestamp', { ascending: false })
          .limit(50),
        supabase
          .from('user_events')
          .select('*, profiles:user_id(full_name, avatar_url)')
          .gte('created_at', fiveMinutesAgo)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('user_device_info')
          .select('*')
          .gte('created_at', fiveMinutesAgo)
      ]);

      // Merge events from both tracking systems
      const allEvents = [
        ...(sessionEvents.data || []).map((e: any) => ({
          ...e,
          timestamp: e.event_timestamp,
          type: e.event_type,
          user_name: e.profiles?.full_name || 'Unknown User',
          avatar_url: e.profiles?.avatar_url
        })),
        ...(legacyEvents.data || []).map((e: any) => ({
          ...e,
          timestamp: e.created_at,
          type: e.event_type,
          page_path: e.page_path || e.metadata?.page_path,
          user_name: e.profiles?.full_name || 'Unknown User',
          avatar_url: e.profiles?.avatar_url
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const deviceBreakdown = (deviceInfo.data || []).reduce((acc: any, d: any) => {
        acc[d.device_type] = (acc[d.device_type] || 0) + 1;
        return acc;
      }, {});

      return {
        activeSessions: sessions.data || [],
        recentEvents: allEvents.slice(0, 50),
        deviceBreakdown: deviceBreakdown || {}
      };
    },
    refetchInterval: 120000,
    refetchIntervalInBackground: false,
    staleTime: 60000,
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
                  <div className="flex items-center gap-3 flex-1">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    {session.profiles?.avatar_url ? (
                      <img src={session.profiles.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{session.profiles?.full_name || 'Anonymous'}</p>
                      <p className="text-xs text-muted-foreground">{session.page_path}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(session.entry_timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="whitespace-nowrap">
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
              liveData.recentEvents.map((event: any, idx: number) => (
                <div key={`${event.id}-${idx}`} className="flex items-center justify-between p-2 border-b text-sm">
                  <div className="flex items-center gap-2 flex-1">
                    {event.avatar_url ? (
                      <img src={event.avatar_url} alt="" className="w-6 h-6 rounded-full" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                        <Users className="w-3 h-3" />
                      </div>
                    )}
                    <span className="font-medium text-xs">{event.user_name}</span>
                    <span className="text-muted-foreground">•</span>
                    <Badge variant="secondary" className="text-xs">
                      {event.type}
                    </Badge>
                    {event.page_path && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground truncate text-xs">{event.page_path}</span>
                      </>
                    )}
                    {event.element_id && (
                      <code className="text-xs bg-muted px-2 py-1 rounded">#{event.element_id}</code>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                    {new Date(event.timestamp).toLocaleTimeString()}
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

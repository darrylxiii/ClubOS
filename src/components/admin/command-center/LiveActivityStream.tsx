import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Radio, 
  LogIn, 
  FileText, 
  Calendar, 
  Shield, 
  AlertTriangle,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

interface ActivityEvent {
  id: string;
  type: 'login' | 'application' | 'meeting' | 'security' | 'approval' | 'error';
  title: string;
  description?: string;
  timestamp: string;
  user?: string;
}

const eventConfig = {
  login: {
    icon: LogIn,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  application: {
    icon: FileText,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  meeting: {
    icon: Calendar,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  security: {
    icon: Shield,
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
  },
  approval: {
    icon: LogIn,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  error: {
    icon: AlertTriangle,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
  },
};

export function LiveActivityStream() {
  const queryClient = useQueryClient();

  const { data: events, isLoading } = useQuery<ActivityEvent[]>({
    queryKey: ['live-activity-stream'],
    queryFn: async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const [activityResult, applicationsResult, errorsResult] = await Promise.all([
        supabase
          .from('user_activity_tracking')
          .select('id, user_id, last_activity_at, action_type')
          .gte('last_activity_at', oneHourAgo.toISOString())
          .order('last_activity_at', { ascending: false })
          .limit(10),
        supabase
          .from('applications')
          .select('id, candidate_full_name, position, status, created_at')
          .gte('created_at', oneHourAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('error_logs')
          .select('id, error_message, severity, created_at')
          .gte('created_at', oneHourAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const events: ActivityEvent[] = [];

      activityResult.data?.forEach((activity: any) => {
        events.push({
          id: `activity-${activity.id}`,
          type: 'login',
          title: 'Session Active',
          description: activity.action_type || 'User active',
          timestamp: activity.last_activity_at,
        });
      });

      applicationsResult.data?.forEach((app: any) => {
        const name = app.candidate_full_name || 'Candidate';
        events.push({
          id: `app-${app.id}`,
          type: 'application',
          title: `${name} Applied`,
          description: app.position,
          timestamp: app.created_at,
        });
      });

      errorsResult.data?.forEach((error: any) => {
        events.push({
          id: `error-${error.id}`,
          type: 'error',
          title: error.severity === 'critical' ? 'Critical Error' : 'Error',
          description: error.error_message?.substring(0, 80),
          timestamp: error.created_at,
        });
      });

      events.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return events.slice(0, 12);
    },
    refetchInterval: 15000,
  });

  useEffect(() => {
    const channel = supabase
      .channel('activity-stream')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_activity_tracking' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['live-activity-stream'] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'applications' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['live-activity-stream'] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'error_logs' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['live-activity-stream'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return (
    <Card className="glass-card h-full flex flex-col">
      <CardHeader className="pb-2 px-3 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Radio className="h-4 w-4 text-primary" />
            Activity
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </CardTitle>
          <Badge variant="outline" className="text-[10px] px-1.5 h-5">
            1h
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 px-3 pb-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !events || events.length === 0 ? (
          <div className="text-center py-4">
            <Radio className="h-6 w-6 mx-auto text-muted-foreground mb-1.5" />
            <p className="text-xs text-muted-foreground">No recent activity</p>
          </div>
        ) : (
          <ScrollArea className="h-[180px] -mx-1 px-1">
            <div className="space-y-1">
              {events.map((event) => {
                const config = eventConfig[event.type];
                const Icon = config.icon;
                
                return (
                  <div
                    key={event.id}
                    className={cn(
                      "flex items-start gap-2 p-1.5 rounded-md",
                      config.bg
                    )}
                  >
                    <div className={cn("p-1 rounded shrink-0 mt-0.5", config.bg)}>
                      <Icon className={cn("h-3 w-3", config.color)} />
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium truncate" title={event.title}>
                          {event.title}
                        </span>
                        <span className="text-[9px] text-muted-foreground whitespace-nowrap shrink-0">
                          {formatDistanceToNow(new Date(event.timestamp), { addSuffix: false })}
                        </span>
                      </div>
                      {event.description && (
                        <p className="text-[10px] text-muted-foreground truncate" title={event.description}>
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

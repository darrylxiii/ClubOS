import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bot, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Zap,
  MessageSquare,
  Target,
  Users,
  FileSearch
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AgentEvent {
  id: string;
  event_type: string;
  event_source: string;
  entity_type: string | null;
  entity_id: string | null;
  event_data: Record<string, unknown>;
  processed: boolean;
  processed_by: string[] | null;
  processing_results: Record<string, unknown> | null;
  created_at: string;
}

const eventTypeConfig: Record<string, { icon: typeof Bot; color: string; label: string }> = {
  'INSERT_applications': { icon: FileSearch, color: 'text-blue-500', label: 'New Application' },
  'UPDATE_applications': { icon: Target, color: 'text-emerald-500', label: 'Application Updated' },
  'INSERT_pilot_tasks': { icon: CheckCircle2, color: 'text-purple-500', label: 'Task Created' },
  'UPDATE_pilot_tasks': { icon: CheckCircle2, color: 'text-purple-500', label: 'Task Updated' },
  'INSERT_quantum_meetings': { icon: Users, color: 'text-amber-500', label: 'Meeting Scheduled' },
  'goal_created': { icon: Target, color: 'text-primary', label: 'Goal Created' },
  'goal_progress': { icon: Zap, color: 'text-emerald-500', label: 'Goal Progress' },
  'agent_action': { icon: Bot, color: 'text-blue-500', label: 'Agent Action' },
  'default': { icon: Bot, color: 'text-muted-foreground', label: 'Event' },
};

export function AgentActivityFeed({ limit = 20 }: { limit?: number }) {
  const { user } = useAuth();

  const { data: events, isLoading } = useQuery({
    queryKey: ['agent-events', user?.id, limit],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('agent_events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as AgentEvent[];
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Agent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!events?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Agent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Bot className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              No agent activity yet. Create a goal to get started!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Agent Activity
          {events.some(e => !e.processed) && (
            <Badge variant="secondary" className="ml-2">
              {events.filter(e => !e.processed).length} pending
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="space-y-1 p-4 pt-0">
            {events.map((event) => (
              <ActivityItem key={event.id} event={event} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function ActivityItem({ event }: { event: AgentEvent }) {
  const config = eventTypeConfig[event.event_type] || eventTypeConfig.default;
  const Icon = config.icon;

  const getEventDescription = (event: AgentEvent): string => {
    const data = event.event_data as Record<string, unknown>;
    
    if (data?.new && typeof data.new === 'object') {
      const newData = data.new as Record<string, unknown>;
      if (newData.title) return String(newData.title);
      if (newData.name) return String(newData.name);
      if (newData.goal_description) return String(newData.goal_description);
    }
    
    if (event.processing_results?.action) {
      return String(event.processing_results.action);
    }

    return `${event.entity_type || 'Entity'} ${event.event_type.split('_')[0].toLowerCase()}d`;
  };

  return (
    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
      <div className={`p-1.5 rounded-full bg-muted ${config.color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">
            {config.label}
          </span>
          {event.processed ? (
            <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
          ) : (
            <Clock className="h-3 w-3 text-amber-500 flex-shrink-0" />
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {getEventDescription(event)}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
          </span>
          {event.processed_by?.length ? (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {event.processed_by.join(', ')}
            </Badge>
          ) : null}
        </div>
      </div>
    </div>
  );
}

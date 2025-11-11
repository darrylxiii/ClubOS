import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Building2, Eye, TrendingUp, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ActivityEvent {
  id: string;
  event_type: string;
  event_data: any;
  created_at: string;
  visibility: string;
}

const eventIcons = {
  interview_scheduled: Briefcase,
  job_applied: TrendingUp,
  offer_received: Users,
  job_published: Building2,
  company_milestone: TrendingUp,
  profile_view: Eye,
};

const eventColors = {
  interview_scheduled: "bg-muted/20 text-foreground",
  job_applied: "bg-green-500/10 text-green-500",
  offer_received: "bg-muted/20 text-foreground",
  job_published: "bg-muted/20 text-foreground",
  company_milestone: "bg-muted/20 text-foreground",
  profile_view: "bg-muted/20 text-foreground",
};

export const LivePulse = () => {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch recent events
    const fetchEvents = async () => {
      const { data } = await supabase
        .from('activity_feed')
        .select('*')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) setEvents(data as ActivityEvent[]);
    };

    fetchEvents();

    // Subscribe to new events
    const channel = supabase
      .channel('activity_feed_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_feed'
        },
        (payload) => {
          const newEvent = payload.new as ActivityEvent;
          if (newEvent.visibility === 'public') {
            setEvents(prev => [newEvent, ...prev].slice(0, 10));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getEventText = (event: ActivityEvent) => {
    const { user_name, company_name, job_title, milestone } = event.event_data;
    
    switch (event.event_type) {
      case 'interview_scheduled':
        return `${user_name} just scheduled an interview at ${company_name}`;
      case 'job_applied':
        return `${user_name} applied to ${job_title} at ${company_name}`;
      case 'offer_received':
        return `${user_name} received an offer from ${company_name}`;
      case 'job_published':
        return `${company_name} just published ${job_title}`;
      case 'company_milestone':
        return `${company_name}: ${milestone}`;
      case 'profile_view':
        return `${company_name} viewed ${user_name}'s profile`;
      default:
        return 'New activity';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <Card className="p-4 border-border/50 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Live Pulse</h3>
        <Badge variant="outline" className="animate-pulse">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
          Live
        </Badge>
      </div>
      
      <ScrollArea className="h-[400px]">
        <div className="space-y-3">
          {events.map((event) => {
            const Icon = eventIcons[event.event_type as keyof typeof eventIcons] || TrendingUp;
            const colorClass = eventColors[event.event_type as keyof typeof eventColors] || "bg-gray-500/10 text-gray-500";
            
            return (
              <div
                key={event.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer animate-fade-in"
                onClick={() => {
                  // Navigate based on event type
                  if (event.event_type === 'job_published') {
                    navigate('/jobs');
                  }
                }}
              >
                <div className={`p-2 rounded-lg ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {getEventText(event)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatTime(event.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
};

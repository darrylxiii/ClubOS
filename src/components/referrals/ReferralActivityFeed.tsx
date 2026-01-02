import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, Send, TrendingUp, DollarSign, Award, 
  Trophy, Zap, Gift, Bell
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useReferralActivityFeed } from "@/hooks/useReferralLeaderboard";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const eventIcons: Record<string, any> = {
  referral_submitted: Send,
  stage_advanced: TrendingUp,
  placement_made: DollarSign,
  earnings_paid: Gift,
  tier_upgrade: Award,
  achievement_unlocked: Trophy,
  challenge_joined: Zap,
  challenge_won: Trophy,
};

const eventColors: Record<string, string> = {
  referral_submitted: "text-blue-500 bg-blue-500/10",
  stage_advanced: "text-amber-500 bg-amber-500/10",
  placement_made: "text-green-500 bg-green-500/10",
  earnings_paid: "text-primary bg-primary/10",
  tier_upgrade: "text-purple-500 bg-purple-500/10",
  achievement_unlocked: "text-amber-500 bg-amber-500/10",
  challenge_joined: "text-blue-500 bg-blue-500/10",
  challenge_won: "text-amber-500 bg-amber-500/10",
};

interface ActivityEvent {
  id: string;
  event_type: string;
  display_message: string;
  created_at: string;
  event_data: any;
  is_anonymous: boolean;
}

const ActivityItem = ({ event, isNew }: { event: ActivityEvent; isNew?: boolean }) => {
  const Icon = eventIcons[event.event_type] || Activity;
  const colorClass = eventColors[event.event_type] || "text-muted-foreground bg-muted";
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg transition-colors",
        isNew && "bg-primary/5 border border-primary/20"
      )}
    >
      <div className={cn("p-2 rounded-full shrink-0", colorClass)}>
        <Icon className="h-4 w-4" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">
          {event.display_message}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
        </p>
      </div>
      
      {isNew && (
        <Badge variant="secondary" className="text-xs shrink-0">
          New
        </Badge>
      )}
    </motion.div>
  );
};

export function ReferralActivityFeed() {
  const { data: initialEvents, isLoading } = useReferralActivityFeed();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [newEventIds, setNewEventIds] = useState<Set<string>>(new Set());

  // Initialize events from query
  useEffect(() => {
    if (initialEvents) {
      setEvents(initialEvents as ActivityEvent[]);
    }
  }, [initialEvents]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('referral-activity')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'referral_activity_feed',
        },
        (payload) => {
          const newEvent = payload.new as ActivityEvent;
          
          setEvents((prev) => [newEvent, ...prev.slice(0, 19)]);
          setNewEventIds((prev) => new Set([...prev, newEvent.id]));
          
          // Remove "new" badge after 10 seconds
          setTimeout(() => {
            setNewEventIds((prev) => {
              const next = new Set(prev);
              next.delete(newEvent.id);
              return next;
            });
          }, 10000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <Activity className="h-4 w-4 text-primary" />
          Live Activity
          <div className="ml-auto flex items-center gap-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-[300px] pr-2">
          {events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No recent activity</p>
              <p className="text-xs">Activity will appear here in real-time</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {events.map((event) => (
                  <ActivityItem 
                    key={event.id} 
                    event={event} 
                    isNew={newEventIds.has(event.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

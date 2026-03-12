import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Video, User, CheckCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { format, isToday, isTomorrow, addDays, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";

interface ScheduleItem {
  id: string;
  title: string;
  time: Date;
  type: 'interview' | 'meeting';
  guestName?: string;
  videoLink?: string;
}

export function UpcomingScheduleWidget() {
  const { user } = useAuth();

  const { data: items, isLoading } = useQuery({
    queryKey: ['upcoming-schedule', user?.id],
    queryFn: async (): Promise<ScheduleItem[]> => {
      if (!user) return [];

      const now = new Date();
      const weekFromNow = addDays(now, 7);

      // Fetch bookings for next 7 days
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, scheduled_start, video_meeting_link, guest_name, guest_email')
        .gte('scheduled_start', now.toISOString())
        .lte('scheduled_start', weekFromNow.toISOString())
        .order('scheduled_start', { ascending: true })
        .limit(8);

      return (bookings || []).map(b => ({
        id: b.id,
        title: b.guest_name ? `Interview with ${b.guest_name}` : 'Interview',
        time: parseISO(b.scheduled_start),
        type: 'interview' as const,
        guestName: b.guest_name || undefined,
        videoLink: b.video_meeting_link || undefined,
      }));
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const todayItems = items?.filter(i => isToday(i.time)) || [];
  const tomorrowItems = items?.filter(i => isTomorrow(i.time)) || [];
  const laterItems = items?.filter(i => !isToday(i.time) && !isTomorrow(i.time)) || [];

  const renderItem = (item: ScheduleItem) => {
    const isUpcoming = item.time.getTime() - Date.now() < 30 * 60 * 1000 && item.time > new Date();

    return (
      <div
        key={item.id}
        className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
          isUpcoming
            ? 'border-primary/40 bg-primary/5'
            : 'border-border/30 hover:border-border/60'
        }`}
      >
        <div className={`p-2 rounded-lg shrink-0 ${
          isUpcoming ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
        }`}>
          <User className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.guestName || 'Interview'}</p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {format(item.time, 'HH:mm')}
            {!isToday(item.time) && (
              <span className="ml-1">{format(item.time, 'EEE, MMM d')}</span>
            )}
          </div>
        </div>
        {item.videoLink && isUpcoming && (
          <Button size="sm" asChild>
            <a href={item.videoLink} target="_blank" rel="noopener noreferrer">
              <Video className="h-3 w-3 mr-1" />
              Join
            </a>
          </Button>
        )}
      </div>
    );
  };

  const renderGroup = (label: string, groupItems: ScheduleItem[], labelClass: string) => {
    if (groupItems.length === 0) return null;
    return (
      <div>
        <p className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${labelClass}`}>
          {label}
        </p>
        <div className="space-y-2">
          {groupItems.map(renderItem)}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-primary" />
            Upcoming Schedule
          </CardTitle>
          <Button variant="ghost" size="sm" asChild className="text-xs">
            <Link to="/meetings">
              View All
              <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!items || items.length === 0 ? (
          <div className="flex items-center gap-3 p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
            <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Clear schedule</p>
              <p className="text-xs text-muted-foreground">No upcoming interviews this week</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {renderGroup('Today', todayItems, 'text-primary')}
            {renderGroup('Tomorrow', tomorrowItems, 'text-amber-500')}
            {renderGroup('This Week', laterItems, 'text-muted-foreground')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Video, Clock, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfDay, endOfDay } from "date-fns";
import { getMeetingStatus, type MeetingStatusInfo } from "@/utils/meetingStatus";
import type { UnifiedCalendarEvent } from "@/types/calendar";

interface AgendaMeeting {
  id: string;
  title: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
}

function toCalendarEvent(m: AgendaMeeting): UnifiedCalendarEvent {
  return {
    id: m.id,
    title: m.title,
    start: new Date(m.scheduled_start),
    end: new Date(m.scheduled_end),
    source: 'quantum_club',
    is_quantum_club: true,
    has_club_ai: false,
    meeting_id: m.id,
    color: '',
  };
}

export const ActiveMeetingsWidget = () => {
  const [meetings, setMeetings] = useState<AgendaMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [statuses, setStatuses] = useState<Map<string, MeetingStatusInfo>>(new Map());
  const navigate = useNavigate();

  const refreshStatuses = useCallback((list: AgendaMeeting[]) => {
    const map = new Map<string, MeetingStatusInfo>();
    list.forEach((m) => map.set(m.id, getMeetingStatus(toCalendarEvent(m))));
    setStatuses(map);
  }, []);

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const now = new Date();
        const dayStart = startOfDay(now).toISOString();
        const dayEnd = endOfDay(now).toISOString();

        // Meetings I host
        const { data: hosted } = await supabase
          .from('meetings')
          .select('id, title, scheduled_start, scheduled_end, status')
          .eq('host_id', user.id)
          .gte('scheduled_start', dayStart)
          .lte('scheduled_start', dayEnd)
          .order('scheduled_start');

        // Meetings I participate in
        const { data: participantRows } = await supabase
          .from('meeting_participants')
          .select('meeting_id')
          .eq('user_id', user.id);

        let participantMeetings: AgendaMeeting[] = [];
        if (participantRows?.length) {
          const ids = participantRows.map((r) => r.meeting_id);
          const { data } = await supabase
            .from('meetings')
            .select('id, title, scheduled_start, scheduled_end, status')
            .in('id', ids)
            .gte('scheduled_start', dayStart)
            .lte('scheduled_start', dayEnd)
            .order('scheduled_start');
          participantMeetings = (data as AgendaMeeting[]) || [];
        }

        // Deduplicate and sort
        const all = [...(hosted || []), ...participantMeetings];
        const unique = Array.from(new Map(all.map((m) => [m.id, m])).values());
        unique.sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());

        setMeetings(unique);
        refreshStatuses(unique);
      } catch (err) {
        console.error('Error fetching agenda:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMeetings();
  }, [refreshStatuses]);

  // Refresh statuses every 60s
  useEffect(() => {
    if (!meetings.length) return;
    const interval = setInterval(() => refreshStatuses(meetings), 60_000);
    return () => clearInterval(interval);
  }, [meetings, refreshStatuses]);

  const today = new Date();
  const dateLabel = format(today, 'EEEE, MMM d');

  // Find the first non-ended upcoming meeting to mark as "Next"
  const nextMeetingId = meetings.find((m) => {
    const s = statuses.get(m.id);
    return s && s.status !== 'ended';
  })?.id;

  if (loading) {
    return (
      <Card className="glass-subtle rounded-2xl">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-subtle rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Today's Agenda
          </span>
          <span className="text-xs font-normal text-muted-foreground">{dateLabel}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {meetings.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Calendar className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No meetings scheduled today</p>
            <Button asChild variant="outline" size="sm">
              <Link to="/meetings?tab=calendar">View Calendar</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {meetings.map((m) => {
              const info = statuses.get(m.id);
              const isNext = m.id === nextMeetingId && info?.status === 'upcoming';
              const isLive = info?.status === 'live' || info?.status === 'ending-soon';
              const isStartingSoon = info?.status === 'starting-soon';

              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-card/40"
                >
                  {/* Time column */}
                  <div className="flex w-24 shrink-0 flex-col text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">
                      {format(new Date(m.scheduled_start), 'h:mm a')}
                    </span>
                    <span>{format(new Date(m.scheduled_end), 'h:mm a')}</span>
                  </div>

                  {/* Title + badge */}
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate text-sm font-medium">{m.title}</span>
                    {isLive && (
                      <Badge className="shrink-0 bg-success text-success-foreground text-[10px] animate-pulse">
                        Live
                      </Badge>
                    )}
                    {isStartingSoon && (
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        {info?.description}
                      </Badge>
                    )}
                    {isNext && !isStartingSoon && (
                      <Badge className="shrink-0 border-accent-gold/40 bg-accent-gold/15 text-accent-gold text-[10px]">
                        Next
                      </Badge>
                    )}
                  </div>

                  {/* Action */}
                  {info?.canJoin ? (
                    <Button
                      size="sm"
                      variant="primary"
                      className="shrink-0"
                      onClick={() => navigate(`/meetings/${m.id}/room`)}
                    >
                      <Video className="h-3.5 w-3.5 mr-1" />
                      Join
                    </Button>
                  ) : info?.status === 'ended' ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 text-xs"
                      onClick={() => navigate(`/meetings/${m.id}/insights`)}
                    >
                      View
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        <Button asChild variant="outline" size="sm" className="mt-4 w-full">
          <Link to="/meetings?tab=calendar">
            <ArrowRight className="h-4 w-4 mr-2" />
            View Full Calendar
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

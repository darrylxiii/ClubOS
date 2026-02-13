import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Video, Clock, ArrowRight, Globe } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfDay, endOfDay } from "date-fns";
import { getMeetingStatus, type MeetingStatusInfo } from "@/utils/meetingStatus";
import { fetchUnifiedCalendarEvents } from "@/services/calendarAggregation";
import type { UnifiedCalendarEvent } from "@/types/calendar";

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  quantum_club: { label: 'TQC', color: 'text-primary' },
  google: { label: 'Google', color: 'text-blue-400' },
  microsoft: { label: 'Outlook', color: 'text-emerald-400' },
};

export const ActiveMeetingsWidget = () => {
  const [events, setEvents] = useState<UnifiedCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [statuses, setStatuses] = useState<Map<string, MeetingStatusInfo>>(new Map());
  const navigate = useNavigate();

  const refreshStatuses = useCallback((list: UnifiedCalendarEvent[]) => {
    const map = new Map<string, MeetingStatusInfo>();
    list.forEach((e) => map.set(e.id, getMeetingStatus(e)));
    setStatuses(map);
  }, []);

  useEffect(() => {
    const fetchAgenda = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const now = new Date();
        const unified = await fetchUnifiedCalendarEvents(user.id, startOfDay(now), endOfDay(now));
        setEvents(unified);
        refreshStatuses(unified);
      } catch (err) {
        console.error('Error fetching agenda:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAgenda();
  }, [refreshStatuses]);

  // Refresh statuses every 60s
  useEffect(() => {
    if (!events.length) return;
    const interval = setInterval(() => refreshStatuses(events), 60_000);
    return () => clearInterval(interval);
  }, [events, refreshStatuses]);

  const today = new Date();
  const dateLabel = format(today, 'EEEE, MMM d');

  const nextEventId = events.find((e) => {
    const s = statuses.get(e.id);
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
        {events.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Calendar className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No meetings scheduled today</p>
            <Button asChild variant="outline" size="sm">
              <Link to="/meetings?tab=calendar">View Calendar</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((e) => {
              const info = statuses.get(e.id);
              const isNext = e.id === nextEventId && info?.status === 'upcoming';
              const isLive = info?.status === 'live' || info?.status === 'ending-soon';
              const isStartingSoon = info?.status === 'starting-soon';
              const sourceMeta = SOURCE_LABELS[e.source] || SOURCE_LABELS.quantum_club;

              return (
                <div
                  key={e.id}
                  className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-card/40"
                >
                  {/* Time column */}
                  <div className="flex w-24 shrink-0 flex-col text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">
                      {format(e.start, 'h:mm a')}
                    </span>
                    <span>{format(e.end, 'h:mm a')}</span>
                  </div>

                  {/* Title + badges */}
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate text-sm font-medium">{e.title}</span>
                    {!e.is_quantum_club && (
                      <span className={`shrink-0 text-[10px] font-medium ${sourceMeta.color}`}>
                        {sourceMeta.label}
                      </span>
                    )}
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

                  {/* Action — only show Join for TQC meetings */}
                  {e.is_quantum_club && info?.canJoin ? (
                    <Button
                      size="sm"
                      variant="primary"
                      className="shrink-0"
                      onClick={() => navigate(`/meetings/${e.meeting_id}/room`)}
                    >
                      <Video className="h-3.5 w-3.5 mr-1" />
                      Join
                    </Button>
                  ) : e.is_quantum_club && info?.status === 'ended' ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 text-xs"
                      onClick={() => navigate(`/meetings/${e.meeting_id}/insights`)}
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

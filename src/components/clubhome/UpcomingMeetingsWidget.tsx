import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, Video, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, format } from "date-fns";
import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';

interface BookingRow {
  id: string;
  guest_name: string;
  meeting_type: string | null;
  interview_type: string | null;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  video_meeting_link: string | null;
  quantum_meeting_link: string | null;
  google_meet_hangout_link: string | null;
  job_id: string | null;
  notes: string | null;
}

export const UpcomingMeetingsWidget = () => {
  const { t } = useTranslation('common');
  const { data: meetings, isLoading } = useQuery({
    queryKey: ["upcoming-meetings-widget"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Resolve candidate profile ID for admin-sourced bookings
      const { data: cp } = await supabase
        .from('candidate_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const orFilter = cp?.id
        ? `user_id.eq.${user.id},candidate_id.eq.${cp.id}`
        : `user_id.eq.${user.id}`;

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("bookings")
        .select("id, guest_name, meeting_type, interview_type, scheduled_start, scheduled_end, status, video_meeting_link, quantum_meeting_link, google_meet_hangout_link, job_id, notes")
        .or(orFilter)
        .gte("scheduled_start", now)
        .in("status", ["confirmed", "pending"])
        .order("scheduled_start", { ascending: true })
        .limit(3);

      if (error) throw error;
      return (data as BookingRow[]) || [];
    },
    staleTime: 60_000,
  });

  const getJoinLink = (meeting: BookingRow) =>
    meeting.quantum_meeting_link || meeting.video_meeting_link || meeting.google_meet_hangout_link;

  const getMeetingLabel = (meeting: BookingRow) => {
    if (meeting.interview_type) return meeting.interview_type.replace(/_/g, " ");
    if (meeting.meeting_type) return meeting.meeting_type.replace(/_/g, " ");
    return "Meeting";
  };

  if (isLoading) {
    return (
      <Card className="glass-subtle rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-primary" />
            Upcoming Meetings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!meetings || meetings.length === 0) {
    return null;
  }

  return (
    <Card className="glass-subtle rounded-2xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-primary" />
            Upcoming Meetings
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {meetings.length} scheduled
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {meetings.map((meeting) => {
          const start = new Date(meeting.scheduled_start);
          const joinLink = getJoinLink(meeting);
          const countdown = formatDistanceToNow(start, { addSuffix: true });

          return (
            <div
              key={meeting.id}
              className="flex items-center justify-between p-3 rounded-xl bg-card/40 border border-border/20"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate capitalize">
                    {getMeetingLabel(meeting)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(start, "EEE d MMM · HH:mm")} · {countdown}
                  </p>
                </div>
              </div>
              {joinLink && (
                <Button
                  variant="glass"
                  size="sm"
                  className="flex-shrink-0 ml-2"
                  asChild
                >
                  <a href={joinLink} target="_blank" rel="noopener noreferrer">
                    <Video className="h-3 w-3 mr-1" />
                    Join
                  </a>
                </Button>
              )}
            </div>
          );
        })}

        <Button variant="ghost" size="sm" className="w-full mt-1" asChild>
          <Link to="/meetings">
            View all meetings
            <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Video, Calendar, Clock, Users, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, isToday, isTomorrow, formatDistanceToNow } from "date-fns";

interface Meeting {
  id: string;
  title: string;
  scheduled_start: string;
  scheduled_end: string | null;
  meeting_type: string;
  status: string;
  participants: { full_name: string; avatar_url: string | null }[];
}

export const UpcomingMeetingsWidget = () => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUpcomingMeetings();
    }
  }, [user]);

  const fetchUpcomingMeetings = async () => {
    if (!user) return;

    try {
      // Get meetings where user is a participant
      const { data: participations } = await supabase
        .from('meeting_participants')
        .select('meeting_id')
        .eq('user_id', user.id);

      if (!participations?.length) {
        setMeetings([]);
        setLoading(false);
        return;
      }

      const meetingIds = participations.map(p => p.meeting_id);

      // Fetch meeting details
      const { data: meetingsData } = await supabase
        .from('meetings')
        .select(`
          id,
          title,
          scheduled_start,
          scheduled_end,
          meeting_type,
          status,
          meeting_participants!inner(
            user_id,
            profiles(full_name, avatar_url)
          )
        `)
        .in('id', meetingIds)
        .gte('scheduled_start', new Date().toISOString())
        .in('status', ['scheduled', 'in_progress'])
        .order('scheduled_start', { ascending: true })
        .limit(3);

      if (meetingsData) {
        const formattedMeetings = meetingsData.map(m => ({
          id: m.id,
          title: m.title,
          scheduled_start: m.scheduled_start,
          scheduled_end: m.scheduled_end,
          meeting_type: m.meeting_type,
          status: m.status,
          participants: m.meeting_participants
            ?.filter((p: any) => p.user_id !== user.id)
            .map((p: any) => ({
              full_name: p.profiles?.full_name || 'Unknown',
              avatar_url: p.profiles?.avatar_url
            })) || []
        }));
        setMeetings(formattedMeetings);
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, MMM d');
  };

  const getTimeLabel = (dateStr: string) => {
    return format(new Date(dateStr), 'h:mm a');
  };

  const getStatusBadge = (status: string, scheduledStart: string) => {
    const now = new Date();
    const start = new Date(scheduledStart);
    const minutesUntil = (start.getTime() - now.getTime()) / 60000;

    if (status === 'in_progress') {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Live Now</Badge>;
    }
    if (minutesUntil <= 15 && minutesUntil > 0) {
      return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Starting Soon</Badge>;
    }
    return null;
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Upcoming Meetings
          </CardTitle>
          <CardDescription>Your scheduled calls and interviews</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/meetings" className="flex items-center gap-1">
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {meetings.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No upcoming meetings</p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link to="/meetings">Schedule a Meeting</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {meetings.map(meeting => (
              <Link
                key={meeting.id}
                to={`/meetings/${meeting.id}`}
                className="block p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{meeting.title}</h4>
                      {getStatusBadge(meeting.status, meeting.scheduled_start)}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {getDateLabel(meeting.scheduled_start)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {getTimeLabel(meeting.scheduled_start)}
                      </span>
                      {meeting.participants.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {meeting.participants.length} participant{meeting.participants.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  {meeting.status === 'in_progress' && (
                    <Button size="sm" className="shrink-0">Join</Button>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

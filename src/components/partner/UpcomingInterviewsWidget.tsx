import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Video, Users, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInMinutes, isPast, isFuture, isToday, isThisWeek } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface UpcomingInterviewsWidgetProps {
  jobId: string;
}

export const UpcomingInterviewsWidget = ({ jobId }: UpcomingInterviewsWidgetProps) => {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingInterviews();

    // Real-time subscription
    const channel = supabase
      .channel(`job-interviews-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `job_id=eq.${jobId}`,
        },
        () => {
          fetchUpcomingInterviews();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  const fetchUpcomingInterviews = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          application:applications(
            id,
            candidate_full_name,
            candidate_email,
            current_stage_index
          )
        `)
        .eq('job_id', jobId)
        .eq('is_interview_booking', true)
        .gte('scheduled_start', new Date().toISOString())
        .order('scheduled_start', { ascending: true })
        .limit(10);

      if (error) throw error;
      setInterviews(data || []);
    } catch (error) {
      console.error('Error fetching upcoming interviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeUntil = (date: string) => {
    const minutes = differenceInMinutes(new Date(date), new Date());
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
    return `${Math.floor(minutes / 1440)}d`;
  };

  const todayInterviews = interviews.filter((i) => isToday(new Date(i.scheduled_start)));
  const thisWeekInterviews = interviews.filter((i) => isThisWeek(new Date(i.scheduled_start)) && !isToday(new Date(i.scheduled_start)));
  const feedbackPending = interviews.filter((i) => isPast(new Date(i.scheduled_end)) && !i.feedback_submitted_at);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Upcoming Interviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading interviews...</p>
        </CardContent>
      </Card>
    );
  }

  if (interviews.length === 0 && feedbackPending.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Upcoming Interviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No upcoming interviews scheduled</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Upcoming Interviews
          </div>
          <Badge variant="secondary">{interviews.length + feedbackPending.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Feedback Pending Alert */}
        {feedbackPending.length > 0 && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">
                  {feedbackPending.length} interview{feedbackPending.length !== 1 ? 's' : ''} awaiting feedback
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Please submit feedback to keep the pipeline moving
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Today's Interviews */}
        {todayInterviews.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Today</h4>
            {todayInterviews.map((interview) => (
              <InterviewCard key={interview.id} interview={interview} />
            ))}
          </div>
        )}

        {/* This Week's Interviews */}
        {thisWeekInterviews.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">This Week</h4>
            {thisWeekInterviews.slice(0, 3).map((interview) => (
              <InterviewCard key={interview.id} interview={interview} />
            ))}
            {thisWeekInterviews.length > 3 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                +{thisWeekInterviews.length - 3} more this week
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const InterviewCard = ({ interview }: { interview: any }) => {
  const startTime = new Date(interview.scheduled_start);
  const endTime = new Date(interview.scheduled_end);
  const minutesUntil = differenceInMinutes(startTime, new Date());
  const isStartingSoon = minutesUntil <= 15 && minutesUntil > 0;

  return (
    <div
      className={`p-3 rounded-lg border transition-colors ${
        isStartingSoon
          ? 'bg-yellow-500/5 border-yellow-500/20'
          : 'bg-muted/30 border-border/50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-sm truncate">
              {interview.application?.candidate_full_name || interview.guest_name || 'Interview'}
            </p>
            {isStartingSoon && (
              <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs">
                Starting soon
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{format(startTime, 'HH:mm')}</span>
            </div>
            {interview.interview_type && (
              <Badge variant="outline" className="text-xs py-0">
                {interview.interview_type.replace('_', ' ')}
              </Badge>
            )}
            {interview.interviewer_ids && interview.interviewer_ids.length > 0 && (
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{interview.interviewer_ids.length}</span>
              </div>
            )}
          </div>
        </div>
        {interview.meeting_link && (
          <Button size="sm" variant="outline" className="shrink-0" asChild>
            <a href={interview.meeting_link} target="_blank" rel="noopener noreferrer">
              <Video className="w-3 h-3" />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
};

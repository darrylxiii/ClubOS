import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Video, Users, AlertCircle, CalendarCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInMinutes, isPast, isToday, isThisWeek } from 'date-fns';

interface UpcomingInterviewsWidgetProps {
  jobId: string;
}

interface NormalizedInterview {
  id: string;
  source: 'booking' | 'detected';
  scheduled_start: string;
  scheduled_end: string;
  candidate_name: string | null;
  candidate_email: string | null;
  interview_type: string | null;
  meeting_link: string | null;
  interviewer_ids: string[];
  feedback_submitted_at: string | null;
  status?: string;
  confidence?: string;
  event_title?: string;
}

export const UpcomingInterviewsWidget = ({ jobId }: UpcomingInterviewsWidgetProps) => {
  const [interviews, setInterviews] = useState<NormalizedInterview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingInterviews();

    // Real-time subscriptions for both tables
    const bookingsChannel = supabase
      .channel(`job-bookings-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `job_id=eq.${jobId}`,
        },
        () => fetchUpcomingInterviews()
      )
      .subscribe();

    const detectedChannel = supabase
      .channel(`job-detected-interviews-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'detected_interviews',
          filter: `job_id=eq.${jobId}`,
        },
        () => fetchUpcomingInterviews()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(detectedChannel);
    };
  }, [jobId]);

  const fetchUpcomingInterviews = async () => {
    try {
      const now = new Date().toISOString();

      // Fetch confirmed bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          application:applications(
            id,
            candidate_id,
            candidate_profiles(full_name, email)
          )
        `)
        .eq('job_id', jobId)
        .eq('is_interview_booking', true)
        .gte('scheduled_start', now)
        .order('scheduled_start', { ascending: true })
        .limit(10);

      if (bookingsError) throw bookingsError;

      // Fetch confirmed detected interviews
      const { data: detected, error: detectedError } = await supabase
        .from('detected_interviews')
        .select(`
          *,
          applications(
            id,
            candidate_id,
            candidate_profiles(full_name, email)
          )
        `)
        .eq('job_id', jobId)
        .in('status', ['confirmed', 'pending_review'])
        .gte('scheduled_start', now)
        .order('scheduled_start', { ascending: true })
        .limit(10);

      if (detectedError) throw detectedError;

      // Normalize bookings
      const normalizedBookings: NormalizedInterview[] = (bookings || []).map(b => {
        const candidateProfile = (b.application as any)?.candidate_profiles;
        return {
          id: b.id,
          source: 'booking' as const,
          scheduled_start: b.scheduled_start,
          scheduled_end: b.scheduled_end,
          candidate_name: candidateProfile?.full_name || b.guest_name,
          candidate_email: candidateProfile?.email || b.guest_email,
          interview_type: b.interview_type,
          meeting_link: b.google_meet_hangout_link || null,
          interviewer_ids: b.interviewer_ids || [],
          feedback_submitted_at: b.feedback_submitted_at,
        };
      });

      // Normalize detected interviews
      const normalizedDetected: NormalizedInterview[] = (detected || []).map(d => {
        const candidateProfile = (d.applications as any)?.candidate_profiles;
        
        // Extract interviewer IDs from JSONB fields
        const partnerIds = Array.isArray(d.detected_partners)
          ? d.detected_partners.map((p: any) => p.user_id).filter(Boolean)
          : [];
        const tqcIds = Array.isArray(d.detected_tqc_members)
          ? d.detected_tqc_members.map((t: any) => t.user_id).filter(Boolean)
          : [];

        return {
          id: d.id,
          source: 'detected' as const,
          scheduled_start: d.scheduled_start,
          scheduled_end: d.scheduled_end,
          candidate_name: candidateProfile?.full_name || null,
          candidate_email: candidateProfile?.email || null,
          interview_type: d.interview_type,
          meeting_link: d.meeting_link,
          interviewer_ids: [...partnerIds, ...tqcIds],
          feedback_submitted_at: null,
          status: d.status,
          confidence: d.detection_confidence,
          event_title: d.event_title,
        };
      });

      // Merge and sort by scheduled_start
      const merged = [...normalizedBookings, ...normalizedDetected];
      merged.sort((a, b) => 
        new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime()
      );

      setInterviews(merged);
    } catch (error) {
      console.error('Error fetching upcoming interviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const todayInterviews = interviews.filter((i) => isToday(new Date(i.scheduled_start)));
  const thisWeekInterviews = interviews.filter((i) => 
    isThisWeek(new Date(i.scheduled_start)) && !isToday(new Date(i.scheduled_start))
  );
  const feedbackPending = interviews.filter((i) => 
    isPast(new Date(i.scheduled_end)) && !i.feedback_submitted_at && i.source === 'booking'
  );

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

const InterviewCard = ({ interview }: { interview: NormalizedInterview }) => {
  const startTime = new Date(interview.scheduled_start);
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
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="font-medium text-sm truncate">
              {interview.candidate_name || interview.event_title || 'Interview'}
            </p>
            {interview.source === 'detected' && (
              <Badge variant="outline" className="text-xs shrink-0">
                <CalendarCheck className="w-3 h-3 mr-1" />
                From Calendar
              </Badge>
            )}
            {interview.confidence && interview.source === 'detected' && (
              <Badge 
                variant={interview.confidence === 'high' ? 'default' : 'secondary'} 
                className="text-xs shrink-0"
              >
                {interview.confidence}
              </Badge>
            )}
            {isStartingSoon && (
              <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs shrink-0">
                Starting soon
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
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
                <span>{interview.interviewer_ids.length} interviewer{interview.interviewer_ids.length !== 1 ? 's' : ''}</span>
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

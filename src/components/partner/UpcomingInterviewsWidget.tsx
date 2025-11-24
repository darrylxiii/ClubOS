import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Clock, Video, Users, AlertCircle, CalendarCheck, User, FileText, CalendarClock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInMinutes, isPast, isToday, isThisWeek, parseISO, isFuture } from 'date-fns';
import { Link } from 'react-router-dom';
import { RescheduleMeetingDialog } from '@/components/meetings/RescheduleMeetingDialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface UpcomingInterviewsWidgetProps {
  jobId: string;
}

interface InterviewerProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}

interface NormalizedInterview {
  id: string;
  source: 'booking' | 'detected';
  scheduled_start: string;
  scheduled_end: string;
  candidate_name: string | null;
  candidate_email: string | null;
  candidate_id: string | null;
  candidate_avatar?: string | null;
  interview_type: string | null;
  meeting_link: string | null;
  interviewer_ids: string[];
  interviewers?: InterviewerProfile[];
  feedback_submitted_at: string | null;
  status?: string;
  confidence?: string;
  event_title?: string;
  application_stage?: string;
  job_title?: string;
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

      // Fetch confirmed bookings with pipeline stage
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          application:applications(
            id,
            candidate_id,
            current_stage_index,
            stages,
            candidate_profiles!applications_candidate_id_fkey(
              id,
              full_name, 
              email,
              avatar_url
            )
          ),
          job:jobs!bookings_job_id_fkey(title)
        `)
        .eq('job_id', jobId)
        .eq('is_interview_booking', true)
        .gte('scheduled_start', now)
        .order('scheduled_start', { ascending: true })
        .limit(10);

      if (bookingsError) throw bookingsError;

      // Fetch upcoming detected interviews (future only)
      // Include both job-specific and unlinked (pending_review) interviews that might need linking
      const { data: upcomingDetected, error: upcomingError } = await supabase
        .from('detected_interviews')
        .select(`
          *,
          applications(
            id,
            candidate_id,
            current_stage_index,
            stages,
            candidate_profiles!applications_candidate_id_fkey(
              id,
              full_name, 
              email,
              avatar_url
            )
          ),
          job:jobs!detected_interviews_job_id_fkey(title)
        `)
        .or(`job_id.eq.${jobId},and(job_id.is.null,status.eq.pending_review)`)
        .in('status', ['confirmed', 'pending_review'])
        .gte('scheduled_start', now)
        .order('scheduled_start', { ascending: true })
        .limit(20);

      // Fetch ALL confirmed/linked detected interviews (regardless of date)
      const { data: linkedDetected, error: linkedError } = await supabase
        .from('detected_interviews')
        .select(`
          *,
          applications(
            id,
            candidate_id,
            current_stage_index,
            stages,
            candidate_profiles!applications_candidate_id_fkey(
              id,
              full_name, 
              email,
              avatar_url
            )
          ),
          job:jobs!detected_interviews_job_id_fkey(title)
        `)
        .eq('job_id', jobId)
        .eq('status', 'confirmed')
        .order('scheduled_start', { ascending: true })
        .limit(20);

      if (upcomingError) throw upcomingError;
      if (linkedError) throw linkedError;

      // Merge and deduplicate
      const detectedMap = new Map();
      [...(upcomingDetected || []), ...(linkedDetected || [])].forEach(d => {
        if (!detectedMap.has(d.id)) {
          detectedMap.set(d.id, d);
        }
      });
      const detected = Array.from(detectedMap.values());

      // Show all detected interviews, even without applications (so they can be linked)
      const validDetected = detected;

      console.log('[UpcomingInterviews] Fetched data:', {
        bookingsCount: bookings?.length || 0,
        detectedCount: detected?.length || 0,
        validDetectedCount: validDetected.length,
        now,
      });

      // Normalize bookings
      const normalizedBookings: NormalizedInterview[] = (bookings || []).map(b => {
        const app = b.application as any;
        const candidateProfile = app?.candidate_profiles;
        const stages = app?.stages ? (typeof app.stages === 'string' ? JSON.parse(app.stages) : app.stages) : [];
        const currentStage = stages[app?.current_stage_index || 0];
        
        return {
          id: b.id,
          source: 'booking' as const,
          scheduled_start: b.scheduled_start,
          scheduled_end: b.scheduled_end,
          candidate_name: candidateProfile?.full_name || b.guest_name,
          candidate_email: candidateProfile?.email || b.guest_email,
          candidate_id: candidateProfile?.id || null,
          candidate_avatar: candidateProfile?.avatar_url || null,
          interview_type: b.interview_type,
          meeting_link: b.video_meeting_link || b.quantum_meeting_link,
          interviewer_ids: b.interviewer_ids || [],
          feedback_submitted_at: b.feedback_submitted_at,
          application_stage: currentStage?.name,
          job_title: (b.job as any)?.title,
        };
      });

      // Normalize detected interviews
      const normalizedDetected: NormalizedInterview[] = validDetected.map(d => {
        const app = d.applications as any;
        const candidateProfile = app?.candidate_profiles;
        const stages = app?.stages ? (typeof app.stages === 'string' ? JSON.parse(app.stages) : app.stages) : [];
        const currentStage = stages[app?.current_stage_index || 0];
        
        // Use interviewer_ids if available, otherwise fall back to detected_partners
        const interviewerIds = d.interviewer_ids && d.interviewer_ids.length > 0
          ? d.interviewer_ids
          : (Array.isArray(d.detected_partners) 
              ? d.detected_partners.map((p: any) => p.user_id).filter(Boolean)
              : []);
        
        // Use candidate info from detection if application not linked yet
        const candidateName = candidateProfile?.full_name || d.candidate_name || null;
        const candidateEmail = candidateProfile?.email || d.candidate_email || null;
        const candidateId = candidateProfile?.id || d.candidate_id || null;
        
        return {
          id: d.id,
          source: 'detected' as const,
          scheduled_start: parseISO(d.scheduled_start).toISOString(),
          scheduled_end: parseISO(d.scheduled_end).toISOString(),
          candidate_name: candidateName,
          candidate_email: candidateEmail,
          candidate_id: candidateId,
          candidate_avatar: candidateProfile?.avatar_url || null,
          interview_type: d.interview_type,
          meeting_link: d.meeting_link,
          interviewer_ids: interviewerIds,
          feedback_submitted_at: null,
          status: d.status,
          confidence: d.detection_confidence,
          event_title: d.event_title,
          application_stage: currentStage?.name,
          job_title: (d.job as any)?.title,
        };
      });

      const allInterviews = [...normalizedBookings, ...normalizedDetected]
        .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());

      // Fetch interviewer profiles for all interviews
      const allInterviewerIds = Array.from(
        new Set(allInterviews.flatMap(i => i.interviewer_ids || []))
      ).filter(Boolean);

      if (allInterviewerIds.length > 0) {
        const { data: interviewers } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', allInterviewerIds);

        const interviewerMap = new Map(
          (interviewers || []).map(i => [i.id, i])
        );

        allInterviews.forEach(interview => {
          interview.interviewers = (interview.interviewer_ids || [])
            .map(id => interviewerMap.get(id))
            .filter(Boolean) as InterviewerProfile[];
        });
      }

      setInterviews(allInterviews);
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
  const laterInterviews = interviews.filter((i) => {
    const start = new Date(i.scheduled_start);
    return !isToday(start) && !isThisWeek(start) && isFuture(start);
  });
  const feedbackPending = interviews.filter((i) => 
    isPast(new Date(i.scheduled_end)) && !i.feedback_submitted_at && i.source === 'booking'
  );

  console.log('[UpcomingInterviews] Categories:', {
    total: interviews.length,
    today: todayInterviews.length,
    thisWeek: thisWeekInterviews.length,
    later: laterInterviews.length,
    feedbackPending: feedbackPending.length,
    interviews: interviews.map(i => ({
      id: i.id,
      candidate: i.candidate_name,
      start: i.scheduled_start,
      isToday: isToday(new Date(i.scheduled_start)),
      isThisWeek: isThisWeek(new Date(i.scheduled_start)),
    })),
  });

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
          <p className="text-sm text-muted-foreground">
            No upcoming interviews scheduled
            {process.env.NODE_ENV === 'development' && (
              <span className="block text-xs mt-2 text-muted-foreground/60">
                Debug: Checked at {new Date().toISOString()}
              </span>
            )}
          </p>
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

        {/* Later Interviews */}
        {laterInterviews.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Upcoming</h4>
            {laterInterviews.slice(0, 3).map((interview) => (
              <InterviewCard key={interview.id} interview={interview} />
            ))}
            {laterInterviews.length > 3 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                +{laterInterviews.length - 3} more upcoming
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const InterviewCard = ({ interview }: { interview: NormalizedInterview }) => {
  const [showReschedule, setShowReschedule] = useState(false);
  const [showPrepDoc, setShowPrepDoc] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [prepDocUrl, setPrepDocUrl] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  
  const startTime = new Date(interview.scheduled_start);
  const endTime = new Date(interview.scheduled_end);
  const minutesUntil = differenceInMinutes(startTime, new Date());
  const isStartingSoon = minutesUntil <= 15 && minutesUntil > 0;
  const isPastInterview = isPast(endTime);
  
  // Load prep document if exists
  useEffect(() => {
    if (interview.source === 'booking' && interview.id) {
      loadPrepDocument();
    }
  }, [interview.id, interview.source]);
  
  const loadPrepDocument = async () => {
    try {
      // Check if prep document exists in booking metadata or separate table
      const { data: booking } = await supabase
        .from('bookings')
        .select('metadata, interview_prep_doc_url')
        .eq('id', interview.id)
        .single();
      
      if (booking) {
        const docUrl = booking.interview_prep_doc_url || (booking.metadata as any)?.prep_doc_url;
        if (docUrl) {
          setPrepDocUrl(docUrl);
        }
      }
    } catch (error) {
      console.error('Error loading prep document:', error);
    }
  };
  
  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) {
      toast.error('Please enter feedback');
      return;
    }
    
    setIsSubmittingFeedback(true);
    try {
      if (interview.source === 'booking') {
        // Submit feedback for booking
        const { error } = await supabase
          .from('bookings')
          .update({
            feedback_submitted_at: new Date().toISOString(),
            feedback_notes: feedbackText,
          })
          .eq('id', interview.id);
        
        if (error) throw error;
        
        // Also create/update interview feedback record if table exists
        const { error: feedbackError } = await supabase
          .from('interview_feedback')
          .upsert({
            booking_id: interview.id,
            candidate_id: interview.candidate_id,
            feedback_text: feedbackText,
            submitted_at: new Date().toISOString(),
          }, {
            onConflict: 'booking_id'
          });
        
        if (feedbackError && feedbackError.code !== 'PGRST116') {
          console.warn('Could not save to interview_feedback table:', feedbackError);
        }
      }
      
      toast.success('Feedback submitted successfully');
      setShowFeedback(false);
      setFeedbackText('');
      // Trigger refresh
      window.location.reload();
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast.error(error.message || 'Failed to submit feedback');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      className={`p-4 rounded-lg border transition-all ${
        isStartingSoon
          ? 'bg-yellow-500/5 border-yellow-500/30 shadow-sm'
          : 'bg-card border-border hover:border-border/80 hover:shadow-sm'
      }`}
    >
      {/* Header: Candidate + Join Button */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <Link 
          to={interview.candidate_id ? `/candidate/${interview.candidate_id}` : '#'}
          className={`flex items-center gap-3 flex-1 min-w-0 ${interview.candidate_id ? 'hover:opacity-80 transition-opacity' : 'pointer-events-none'}`}
        >
          {/* Candidate Avatar */}
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={interview.candidate_avatar || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {interview.candidate_name ? getInitials(interview.candidate_name) : '?'}
            </AvatarFallback>
          </Avatar>

          {/* Candidate Name + Badges */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="font-semibold text-sm truncate hover:underline">
                {interview.candidate_name || interview.event_title || 'Interview'}
              </p>
              {interview.source === 'detected' && (
                <Badge variant="outline" className="text-xs shrink-0 border-primary/20 text-primary">
                  <CalendarCheck className="w-3 h-3 mr-1" />
                  From Calendar
                </Badge>
              )}
              {interview.source === 'detected' && interview.status === 'pending_review' && !interview.candidate_id && (
                <Badge variant="outline" className="text-xs shrink-0 border-orange-500/30 text-orange-600 bg-orange-50">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Needs Linking
                </Badge>
              )}
              {isStartingSoon && (
                <Badge className="text-xs shrink-0 bg-yellow-500/15 text-yellow-700 hover:bg-yellow-500/20 border-yellow-500/30">
                  ⚡ Starting soon
                </Badge>
              )}
            </div>
            
            {/* Date & Time */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span className="font-medium">
                {format(startTime, 'EEEE, MMM d')} • {format(startTime, 'HH:mm')}-{format(endTime, 'HH:mm')}
              </span>
            </div>
          </div>
        </Link>

        {/* Join Button */}
        {interview.meeting_link && (
          <Button 
            size="sm" 
            className="shrink-0" 
            variant={isStartingSoon ? "default" : "outline"}
            asChild
          >
            <a href={interview.meeting_link} target="_blank" rel="noopener noreferrer">
              <Video className="w-3.5 h-3.5 mr-1.5" />
              Join
            </a>
          </Button>
        )}
      </div>

      {/* Interviewers */}
      {interview.interviewers && interview.interviewers.length > 0 && (
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border/50">
          <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground shrink-0">With:</span>
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {interview.interviewers.slice(0, 3).map((interviewer, idx) => (
              <div key={interviewer.id} className="flex items-center gap-1.5">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={interviewer.avatar_url || undefined} />
                  <AvatarFallback className="bg-muted text-xs">
                    {getInitials(interviewer.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium truncate">
                  {interviewer.full_name.split(' ')[0]}
                </span>
                {idx < Math.min(interview.interviewers!.length - 1, 2) && (
                  <span className="text-xs text-muted-foreground">•</span>
                )}
              </div>
            ))}
            {interview.interviewers.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{interview.interviewers.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Pipeline Stage + Job Title */}
      {(interview.application_stage || interview.job_title) && (
        <div className="flex items-center gap-2 mb-3 text-xs">
          <Badge variant="secondary" className="font-normal">
            {interview.application_stage || 'Interview'}
          </Badge>
          {interview.job_title && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground truncate">{interview.job_title}</span>
            </>
          )}
        </div>
      )}

      {/* Action Shortcuts */}
      <div className="flex items-center gap-2 flex-wrap">
        {interview.candidate_id && (
          <Button size="sm" variant="ghost" className="h-8 text-xs" asChild>
            <Link to={`/candidate/${interview.candidate_id}`}>
              <User className="w-3.5 h-3.5 mr-1.5" />
              View Profile
            </Link>
          </Button>
        )}
        
        {/* Prep Doc Button */}
        <Dialog open={showPrepDoc} onOpenChange={setShowPrepDoc}>
          <DialogTrigger asChild>
            <Button size="sm" variant="ghost" className="h-8 text-xs">
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Prep Doc
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Interview Prep Document</DialogTitle>
              <DialogDescription>
                {prepDocUrl ? 'View or update the prep document for this interview' : 'Upload a prep document for this interview'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {prepDocUrl ? (
                <div className="space-y-2">
                  <Label>Current Document</Label>
                  <Button asChild variant="outline" className="w-full">
                    <a href={prepDocUrl} target="_blank" rel="noopener noreferrer">
                      <FileText className="w-4 h-4 mr-2" />
                      View Prep Document
                    </a>
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No prep document uploaded yet. Use the manual entry or calendar linker to add one.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Feedback Button - Show for past interviews or if feedback not submitted */}
        {(isPastInterview || !interview.feedback_submitted_at) && interview.source === 'booking' && (
          <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 text-xs">
                <FileText className="w-3.5 h-3.5 mr-1.5" />
                {interview.feedback_submitted_at ? 'View Feedback' : 'Submit Feedback'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {interview.feedback_submitted_at ? 'Interview Feedback' : 'Submit Interview Feedback'}
                </DialogTitle>
                <DialogDescription>
                  {interview.feedback_submitted_at 
                    ? 'Feedback has been submitted for this interview'
                    : 'Share your feedback about this interview'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="feedback">Feedback</Label>
                  <Textarea
                    id="feedback"
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Enter your feedback about the candidate and interview..."
                    rows={6}
                    disabled={!!interview.feedback_submitted_at}
                  />
                </div>
                {!interview.feedback_submitted_at && (
                  <Button 
                    onClick={handleSubmitFeedback} 
                    disabled={isSubmittingFeedback || !feedbackText.trim()}
                    className="w-full"
                  >
                    {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
        
        {/* Reschedule Button - Only for future bookings */}
        {!isPastInterview && interview.source === 'booking' && interview.id && (
          <>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 text-xs ml-auto" 
              onClick={() => setShowReschedule(true)}
            >
              <CalendarClock className="w-3.5 h-3.5 mr-1.5" />
              Reschedule
            </Button>
            <RescheduleMeetingDialog
              open={showReschedule}
              onOpenChange={setShowReschedule}
              bookingId={interview.id}
              currentDate={interview.scheduled_start}
              onRescheduled={() => {
                setShowReschedule(false);
                window.location.reload();
              }}
            />
          </>
        )}
      </div>
    </div>
  );
};

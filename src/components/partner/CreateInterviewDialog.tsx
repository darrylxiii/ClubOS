import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Sparkles, Loader2, Users, AlertCircle, CheckCircle2, Mail, Link2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SmartSchedulingPanel } from './SmartSchedulingPanel';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';

interface CreateInterviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: any;
  jobId: string;
  stageIndex: number;
  stageName: string;
  onInterviewCreated?: () => void;
}

export const CreateInterviewDialog = ({
  open,
  onOpenChange,
  application,
  jobId,
  stageIndex,
  stageName,
  onInterviewCreated,
}: CreateInterviewDialogProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState('09:00');
  const [duration, setDuration] = useState(60);
  const [interviewType, setInterviewType] = useState<string>('technical');
  const [selectedInterviewers, setSelectedInterviewers] = useState<string[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [job, setJob] = useState<any>(null);
  const [showSmartScheduling, setShowSmartScheduling] = useState(false);
  
  // Calendar connection state
  const [calendarConnection, setCalendarConnection] = useState<any>(null);
  const [hasCalendarConnected, setHasCalendarConnected] = useState(false);
  const [syncToCalendar, setSyncToCalendar] = useState(true);
  const [checkingCalendar, setCheckingCalendar] = useState(true);
  
  // Attendee emails state
  const [candidateEmail, setCandidateEmail] = useState('');
  const [interviewerEmails, setInterviewerEmails] = useState<{id: string; name: string; email: string}[]>([]);

  useEffect(() => {
    if (open && user) {
      fetchCalendarConnection();
      fetchJobAndTeam();
    }
  }, [open, user]);

  useEffect(() => {
    if (job && application) {
      autoGenerateTitleAndDescription();
    }
  }, [job, application, interviewType, selectedInterviewers]);

  const fetchCalendarConnection = async () => {
    if (!user) return;
    setCheckingCalendar(true);
    try {
      const { data, error } = await supabase
        .from('calendar_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .eq('is_active', true)
        .maybeSingle();

      if (!error && data) {
        setCalendarConnection(data);
        setHasCalendarConnected(true);
      } else {
        setHasCalendarConnected(false);
      }
    } catch (err) {
      console.error('Error checking calendar connection:', err);
      setHasCalendarConnected(false);
    } finally {
      setCheckingCalendar(false);
    }
  };

  const fetchJobAndTeam = async () => {
    try {
      // Fetch job details
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('*, companies(name)')
        .eq('id', jobId)
        .single();

      if (jobError) throw jobError;
      setJob(jobData);

      // Fetch team members for this job
      const { data: teamData, error: teamError } = await supabase
        .from('job_team_assignments')
        .select(`
          *,
          company_member:company_members(
            id,
            job_title,
            user:profiles(
              id,
              full_name,
              email,
              avatar_url
            )
          )
        `)
        .eq('job_id', jobId)
        .in('job_role', ['hiring_manager', 'technical_interviewer', 'behavioral_interviewer', 'panel_member']);

      if (teamError) throw teamError;
      setTeamMembers(teamData || []);

      // Auto-select interviewers based on stage
      const stageInterviewers = teamData?.filter((member) =>
        member.interview_stages?.includes(stageIndex)
      );
      if (stageInterviewers && stageInterviewers.length > 0) {
        setSelectedInterviewers(stageInterviewers.map((m) => m.company_member_id));
      }

      // Set candidate email
      const candidateEmailValue = application.candidate_email || '';
      setCandidateEmail(candidateEmailValue);

      // Build interviewer emails list
      const emails = teamData?.map((m) => {
        const userProfile = m.company_member?.user;
        return {
          id: m.company_member_id,
          name: (userProfile as any)?.full_name || 'Unknown',
          email: (userProfile as any)?.email || '',
        };
      }).filter(e => e.email) || [];
      setInterviewerEmails(emails);
    } catch (error) {
      console.error('Error fetching job and team:', error);
    }
  };

  const autoGenerateTitleAndDescription = async () => {
    if (!job || !application) return;
    
    setGeneratingAI(true);
    try {
      // Generate smart title: Company - Candidate Name - Stage Interview
      const candidateName = application.candidate_full_name || application.email?.split('@')[0] || 'Candidate';
      const companyName = job?.companies?.name || 'Company';
      const selectedInterviewerNames = teamMembers
        .filter((m) => selectedInterviewers.includes(m.company_member_id))
        .map((m) => m.company_member?.user?.full_name)
        .filter(Boolean)
        .join(', ');

      const generatedTitle = `${companyName} - ${candidateName} - ${stageName}`;
      setTitle(generatedTitle);

      // Generate description with AI
      const prompt = `Generate a professional interview meeting description for:
Candidate: ${candidateName}
Current Title: ${application.candidate_title || 'Not specified'}
Job Position: ${job?.title || 'Position'}
Company: ${companyName}
Interview Stage: ${stageName}
Interview Type: ${interviewType.replace('_', ' ')}
Interviewers: ${selectedInterviewerNames || 'TBD'}

Include:
1. Brief introduction
2. Key areas to assess
3. Interview format
4. A note about the meeting link being included

Keep it concise (3-4 sentences) and professional.`;

      // Use edge function for secure AI generation
      const { data, error } = await supabase.functions.invoke('generate-interview-description', {
        body: {
          candidateName,
          candidateTitle: application.candidate_title,
          jobTitle: job?.title,
          companyName,
          stageName,
          interviewType,
          interviewerNames: selectedInterviewerNames || 'TBD',
        },
      });

      if (!error && data?.description) {
        setDescription(data.description);
      } else {
        // Fallback to template
        setDescription(
          `Interview with ${candidateName} for the ${stageName} stage of the ${job?.title} position at ${companyName}.\n\nInterviewers: ${selectedInterviewerNames || 'TBD'}\n\nKey Assessment Areas:\n- Technical skills and experience\n- Problem-solving approach\n- Cultural fit\n- Communication skills\n\nPlease review the candidate's profile and application before the interview.`
        );
      }
    } catch (error) {
      console.error('Error generating AI content:', error);
      // Use fallback template
      const candidateName = application.candidate_full_name || 'Candidate';
      const companyName = job?.companies?.name || 'Company';
      setDescription(
        `Interview with ${candidateName} for the ${stageName} stage at ${companyName}.\n\nPlease review the candidate's application materials before the interview.`
      );
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleInterviewTypeChange = (type: string) => {
    setInterviewType(type);
    // Auto-adjust duration based on type
    switch (type) {
      case 'screening':
        setDuration(30);
        break;
      case 'technical':
      case 'behavioral':
        setDuration(60);
        break;
      case 'panel':
      case 'founder':
        setDuration(90);
        break;
      case 'final':
        setDuration(120);
        break;
      default:
        setDuration(60);
    }
  };

  const handleSubmit = async () => {
    if (!title || !date || !time) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (selectedInterviewers.length === 0) {
      toast.error('Please select at least one interviewer');
      return;
    }

    setSubmitting(true);
    try {
      // Combine date and time
      const [hours, minutes] = time.split(':').map(Number);
      const scheduledStart = new Date(date);
      scheduledStart.setHours(hours, minutes, 0);

      const scheduledEnd = new Date(scheduledStart);
      scheduledEnd.setMinutes(scheduledEnd.getMinutes() + duration);

      // Get current user
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) throw new Error('User not authenticated');

      // Get or create a system booking link for interviews
      let bookingLinkId = '';
      const { data: existingLink } = await supabase
        .from('booking_links')
        .select('id')
        .eq('user_id', authUser.id)
        .eq('slug', 'system-interviews')
        .single();

      if (existingLink) {
        bookingLinkId = existingLink.id;
      } else {
        // Create system booking link
        const { data: newLink, error: linkError } = await supabase
          .from('booking_links')
          .insert({
            user_id: authUser.id,
            slug: 'system-interviews',
            title: 'Interview Bookings',
            description: 'System-generated booking link for interview scheduling',
            duration_minutes: 60,
            is_active: true,
          })
          .select()
          .single();

        if (linkError) throw linkError;
        bookingLinkId = newLink.id;
      }

      // Collect all attendee emails
      const selectedInterviewerEmailList = interviewerEmails
        .filter((e) => selectedInterviewers.includes(e.id))
        .map((e) => e.email)
        .filter(Boolean);

      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: authUser.id,
          booking_link_id: bookingLinkId,
          guest_name: application.candidate_full_name || 'Candidate',
          guest_email: candidateEmail || 'no-email@temp.com',
          scheduled_start: scheduledStart.toISOString(),
          scheduled_end: scheduledEnd.toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          status: 'confirmed',
          // Interview-specific fields
          application_id: application.id,
          job_id: jobId,
          candidate_id: application.candidate_id,
          interview_stage_index: stageIndex,
          interview_type: interviewType,
          interviewer_ids: selectedInterviewers,
          is_interview_booking: true,
          notes: description,
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Sync to Google Calendar if connected and enabled
      if (hasCalendarConnected && syncToCalendar && calendarConnection) {
        try {
          // Build attendees list for Google Calendar
          const attendees = [];
          if (candidateEmail) {
            attendees.push({ email: candidateEmail });
          }
          selectedInterviewerEmailList.forEach((email) => {
            attendees.push({ email });
          });

          const { data: calData, error: calError } = await supabase.functions.invoke('google-calendar-events', {
            body: {
              action: 'createEvent',
              connectionId: calendarConnection.id,
              event: {
                summary: title,
                description: description,
                start: {
                  dateTime: scheduledStart.toISOString(),
                  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                },
                end: {
                  dateTime: scheduledEnd.toISOString(),
                  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                },
                attendees: attendees,
                reminders: {
                  useDefault: false,
                  overrides: [
                    { method: 'email', minutes: 60 },
                    { method: 'popup', minutes: 15 },
                  ],
                },
              },
            },
          });

          if (calError) {
            console.error('Failed to add to Google Calendar:', calError);
            toast.warning('Interview scheduled, but failed to add to Google Calendar');
          } else if (calData?.event?.id) {
            // Update booking with calendar event ID
            await supabase
              .from('bookings')
              .update({ calendar_event_id: calData.event.id })
              .eq('id', booking.id);
            
            toast.success('Interview scheduled and added to your Google Calendar!');
          }
        } catch (calErr) {
          console.error('Google Calendar sync error:', calErr);
          toast.warning('Interview scheduled, but calendar sync failed');
        }
      } else {
        toast.success('Interview scheduled successfully');
      }

      onInterviewCreated?.();
    } catch (error: any) {
      console.error('Error creating interview:', error);
      toast.error(error.message || 'Failed to schedule interview');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleInterviewer = (memberId: string) => {
    setSelectedInterviewers((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const selectedInterviewerNames = teamMembers
    .filter((m) => selectedInterviewers.includes(m.company_member_id))
    .map((m) => m.company_member?.user?.full_name)
    .filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Schedule Interview - {stageName}
          </DialogTitle>
          <DialogDescription>
            Schedule an interview with {application.candidate_full_name || application.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Calendar Connection Status */}
          {!checkingCalendar && (
            <div className={cn(
              "p-4 rounded-lg border flex items-start gap-3",
              hasCalendarConnected 
                ? "bg-green-500/10 border-green-500/30" 
                : "bg-yellow-500/10 border-yellow-500/30"
            )}>
              {hasCalendarConnected ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-700">Google Calendar Connected</p>
                    <p className="text-xs text-green-600/80">
                      Interview will be synced to your calendar and attendees will receive invites
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Switch
                        checked={syncToCalendar}
                        onCheckedChange={setSyncToCalendar}
                        id="sync-calendar"
                      />
                      <Label htmlFor="sync-calendar" className="text-sm cursor-pointer">
                        Add to Google Calendar
                      </Label>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-700">Google Calendar Not Connected</p>
                    <p className="text-xs text-yellow-600/80">
                      Connect your Google Calendar to automatically sync interviews and send calendar invites
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => window.open('/settings/connections', '_blank')}
                    >
                      <Link2 className="w-4 h-4 mr-2" />
                      Connect Calendar
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* AI-Generated Content Section */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">AI-Powered Auto-Fill</span>
              {generatingAI && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            </div>
            <p className="text-xs text-muted-foreground">
              Title and description auto-generated with company, candidate, and interviewer details
            </p>
          </div>

          {/* Interview Type */}
          <div className="space-y-2">
            <Label>Interview Type *</Label>
            <Select value={interviewType} onValueChange={handleInterviewTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="screening">Screening (30 min)</SelectItem>
                <SelectItem value="technical">Technical Interview (60 min)</SelectItem>
                <SelectItem value="behavioral">Behavioral Interview (60 min)</SelectItem>
                <SelectItem value="culture_fit">Culture Fit (45 min)</SelectItem>
                <SelectItem value="panel">Panel Interview (90 min)</SelectItem>
                <SelectItem value="founder">Founder Interview (90 min)</SelectItem>
                <SelectItem value="final">Final Round (120 min)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>Meeting Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Company - Candidate Name - Interview Stage"
            />
            <p className="text-xs text-muted-foreground">
              Format: {job?.companies?.name || 'Company'} - {application.candidate_full_name || 'Candidate'} - {stageName}
            </p>
          </div>

          {/* Attendee Emails */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Attendee Emails
            </Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  placeholder="Candidate email"
                  className="flex-1"
                />
                <Badge variant="outline" className="shrink-0">Candidate</Badge>
              </div>
              {selectedInterviewerNames.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Interviewers: </span>
                  {interviewerEmails
                    .filter((e) => selectedInterviewers.includes(e.id))
                    .map((e) => `${e.name} (${e.email})`)
                    .join(', ') || 'No emails found'}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Meeting description and agenda"
              rows={4}
            />
          </div>

          {/* Interviewers */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Interviewers * ({selectedInterviewers.length} selected)
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto p-2 border rounded-lg">
              {teamMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground col-span-2 text-center py-4">
                  No team members assigned to this job
                </p>
              ) : (
                teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => toggleInterviewer(member.company_member_id)}
                  >
                    <Checkbox
                      checked={selectedInterviewers.includes(member.company_member_id)}
                      onCheckedChange={() => toggleInterviewer(member.company_member_id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {member.company_member?.user?.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {member.job_role.replace('_', ' ')} • {member.company_member?.user?.email || 'No email'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Smart Scheduling Toggle */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowSmartScheduling(!showSmartScheduling)}
            className="w-full"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {showSmartScheduling ? 'Hide' : 'Show'} Smart Scheduling Assistant
          </Button>

          {/* Smart Scheduling Panel */}
          {showSmartScheduling && (
            <SmartSchedulingPanel
              interviewers={selectedInterviewers}
              candidateEmail={candidateEmail}
              duration={duration}
              calendarConnectionId={hasCalendarConnected ? calendarConnection?.id : undefined}
              onSelectSlot={(slot) => {
                setDate(slot.date);
                setTime(slot.time);
                setShowSmartScheduling(false);
              }}
            />
          )}

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Time *</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label>Duration (minutes)</Label>
            <Select value={duration.toString()} onValueChange={(v) => setDuration(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="90">1.5 hours</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !title || !date || !time}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scheduling...
              </>
            ) : (
              <>
                {hasCalendarConnected && syncToCalendar && (
                  <CalendarIcon className="w-4 h-4 mr-2" />
                )}
                Schedule Interview
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

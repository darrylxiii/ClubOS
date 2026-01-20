import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

interface ManualInterviewEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId?: string;
  onInterviewAdded?: () => void;
}

export function ManualInterviewEntryDialog({
  open,
  onOpenChange,
  jobId,
  onInterviewAdded
}: ManualInterviewEntryDialogProps) {
  const [selectedJobId, setSelectedJobId] = useState(jobId || '');
  const [selectedApplicationId, setSelectedApplicationId] = useState('');
  const [interviewType, setInterviewType] = useState('');
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [meetingLink, setMeetingLink] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch jobs for dropdown
  const { data: jobs } = useQuery({
    queryKey: ['jobs-for-manual-interview'],
    queryFn: async () => {
      const { data } = await supabase
        .from('jobs')
        .select('id, title, companies(name)')
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: open && !jobId
  });

  // Fetch applications for selected job
  const { data: applications } = useQuery({
    queryKey: ['applications-for-job', selectedJobId],
    queryFn: async () => {
      if (!selectedJobId) return [];
      const { data } = await supabase
        .from('applications')
        .select('id, candidate_full_name, candidate_email, current_stage_index')
        .eq('job_id', selectedJobId)
        .order('applied_at', { ascending: false });
      return data || [];
    },
    enabled: !!selectedJobId
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedJobId || !selectedApplicationId || !interviewType || !date || !time) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get application details
      const { data: application } = await supabase
        .from('applications')
        .select('candidate_id, candidate_email, candidate_full_name')
        .eq('id', selectedApplicationId)
        .single();

      if (!application) {
        throw new Error('Application not found');
      }

      // Combine date and time
      const [hours, minutes] = time.split(':');
      const scheduledStart = new Date(date);
      scheduledStart.setHours(parseInt(hours), parseInt(minutes), 0);

      const scheduledEnd = new Date(scheduledStart);
      scheduledEnd.setMinutes(scheduledEnd.getMinutes() + parseInt(duration));

      // Create detected interview with manual flag
      const { error } = await supabase
        .from('detected_interviews' as any)
        .insert({
          calendar_event_id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          calendar_provider: 'manual',
          detection_confidence: 'manual',
          detection_type: interviewType,
          title: `${interviewType === 'tqc_intro' ? 'TQC Introduction' : 'Interview'}: ${application.candidate_full_name}`,
          description: notes || undefined,
          scheduled_start: scheduledStart.toISOString(),
          scheduled_end: scheduledEnd.toISOString(),
          meeting_link: meetingLink || undefined,
          candidate_id: application.candidate_id,
          candidate_email: application.candidate_email,
          candidate_name: application.candidate_full_name,
          application_id: selectedApplicationId,
          job_id: selectedJobId,
          status: 'confirmed',
          manually_edited: true,
          notes: notes || undefined
        });

      if (error) throw error;

      toast.success('Interview added successfully');
      onInterviewAdded?.();
      onOpenChange(false);
      
      // Reset form
      setSelectedApplicationId('');
      setInterviewType('');
      setDate(undefined);
      setTime('');
      setDuration('60');
      setMeetingLink('');
      setNotes('');
    } catch (error: any) {
      console.error('Error adding interview:', error);
      toast.error(error.message || 'Failed to add interview');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Interview Manually</DialogTitle>
          <DialogDescription>
            Add an interview that's already scheduled but not yet in the system
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!jobId && (
            <div className="space-y-2">
              <Label htmlFor="job">Job *</Label>
              <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                <SelectTrigger id="job">
                  <SelectValue placeholder="Select a job" />
                </SelectTrigger>
                <SelectContent>
                  {jobs?.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.title} - {job.companies?.name || 'No Company'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="application">Candidate *</Label>
            <Select 
              value={selectedApplicationId} 
              onValueChange={setSelectedApplicationId}
              disabled={!selectedJobId}
            >
              <SelectTrigger id="application">
                <SelectValue placeholder="Select a candidate" />
              </SelectTrigger>
              <SelectContent>
                {applications?.map((app) => (
                  <SelectItem key={app.id} value={app.id}>
                    {app.candidate_full_name} ({app.candidate_email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="interviewType">Interview Type *</Label>
            <Select value={interviewType} onValueChange={setInterviewType}>
              <SelectTrigger id="interviewType">
                <SelectValue placeholder="Select interview type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tqc_intro">TQC Introduction</SelectItem>
                <SelectItem value="technical">Technical Interview</SelectItem>
                <SelectItem value="behavioral">Behavioral Interview</SelectItem>
                <SelectItem value="partner_interview">Partner Interview</SelectItem>
                <SelectItem value="panel_interview">Panel Interview</SelectItem>
                <SelectItem value="final">Final Interview</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Time *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger id="duration">
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

          <div className="space-y-2">
            <Label htmlFor="meetingLink">Meeting Link</Label>
            <Input
              id="meetingLink"
              type="url"
              placeholder="https://meet.google.com/..."
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional details about this interview..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Interview'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

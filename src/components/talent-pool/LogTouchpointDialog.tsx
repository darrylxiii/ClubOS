import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface LogTouchpointDialogProps {
  candidateId: string;
  candidateName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const touchpointTypes = [
  { value: 'email_outbound', label: 'Email Sent' },
  { value: 'email_inbound', label: 'Email Received' },
  { value: 'call_outbound', label: 'Call Made' },
  { value: 'call_inbound', label: 'Call Received' },
  { value: 'call_missed', label: 'Missed Call' },
  { value: 'voicemail', label: 'Voicemail' },
  { value: 'whatsapp_outbound', label: 'WhatsApp Sent' },
  { value: 'whatsapp_inbound', label: 'WhatsApp Received' },
  { value: 'linkedin_connection', label: 'LinkedIn Connection' },
  { value: 'linkedin_message_out', label: 'LinkedIn Message Sent' },
  { value: 'linkedin_message_in', label: 'LinkedIn Message Received' },
  { value: 'linkedin_inmail', label: 'LinkedIn InMail' },
  { value: 'meeting_virtual', label: 'Virtual Meeting' },
  { value: 'meeting_in_person', label: 'In-Person Meeting' },
  { value: 'meeting_coffee', label: 'Coffee Meeting' },
  { value: 'interview_scheduled', label: 'Interview Scheduled' },
  { value: 'interview_completed', label: 'Interview Completed' },
  { value: 'role_presented', label: 'Role Presented' },
  { value: 'role_declined', label: 'Role Declined' },
  { value: 'role_interested', label: 'Expressed Interest' },
  { value: 'referral_requested', label: 'Referral Requested' },
  { value: 'referral_made', label: 'Referral Made' },
  { value: 'note', label: 'General Note' },
];

export function LogTouchpointDialog({
  candidateId,
  candidateName,
  open,
  onOpenChange,
  onSuccess,
}: LogTouchpointDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [touchpointType, setTouchpointType] = useState<string>('note');
  const [subject, setSubject] = useState('');
  const [summary, setSummary] = useState('');
  const [requiresResponse, setRequiresResponse] = useState(false);
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>();

  const createTouchpointMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('candidate_interactions').insert({
        candidate_id: candidateId,
        interviewer_id: user?.id,
        interaction_type: touchpointType,
        subject,
        notes: summary,
        scheduled_at: followUpDate?.toISOString(),
        created_at: new Date().toISOString(),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['touchpoints', candidateId] });
      queryClient.invalidateQueries({ queryKey: ['talent-pool'] });
      toast.success('Touchpoint logged successfully');
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error('Failed to log touchpoint: ' + error.message);
    },
  });

  const resetForm = () => {
    setTouchpointType('note');
    setSubject('');
    setSummary('');
    setRequiresResponse(false);
    setFollowUpDate(undefined);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTouchpointMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Log Touchpoint</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Record an interaction with {candidateName}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Touchpoint Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Interaction Type</Label>
            <Select value={touchpointType} onValueChange={setTouchpointType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {touchpointTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief description of the interaction"
            />
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <Label htmlFor="summary">Summary / Notes</Label>
            <Textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Key points from the interaction..."
              rows={4}
            />
          </div>

          {/* Options Row */}
          <div className="flex items-center justify-between gap-4">
            {/* Requires Response */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="requires-response"
                checked={requiresResponse}
                onCheckedChange={(checked) => setRequiresResponse(checked === true)}
              />
              <Label htmlFor="requires-response" className="text-sm cursor-pointer">
                Requires response
              </Label>
            </div>

            {/* Follow-up Date */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'justify-start text-left font-normal',
                    !followUpDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {followUpDate ? format(followUpDate, 'PPP') : 'Follow-up date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={followUpDate}
                  onSelect={setFollowUpDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createTouchpointMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createTouchpointMutation.isPending}>
              {createTouchpointMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Log Touchpoint'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { memo, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { InterviewRound } from '@/hooks/useInterviewLoop';

interface ScheduleInterviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: Record<string, unknown> | null;
  jobId: string;
  jobTitle: string;
  rounds: InterviewRound[];
  nextRoundIndex: number;
  onScheduled: () => void;
}

export const ScheduleInterviewDialog = memo(({
  open,
  onOpenChange,
  candidate,
  jobId,
  jobTitle,
  rounds,
  nextRoundIndex,
  onScheduled,
}: ScheduleInterviewDialogProps) => {
  const { t } = useTranslation('jobDashboard');
  const { user } = useAuth();
  const [selectedRound, setSelectedRound] = useState(String(nextRoundIndex));
  const [dateTime, setDateTime] = useState('');
  const [saving, setSaving] = useState(false);

  const candidateName = (candidate?.full_name as string) || 'Candidate';
  const round = rounds[parseInt(selectedRound)] || rounds[0];

  const handleSchedule = async () => {
    if (!candidate || !round || !dateTime) return;
    setSaving(true);

    try {
      const startDate = new Date(dateTime);
      const endDate = new Date(startDate.getTime() + (round.durationMinutes || 30) * 60 * 1000);

      // Insert meeting
      const { error: meetingError } = await (supabase as any).from('meetings').insert({
        job_id: jobId,
        application_id: candidate.id,
        title: `${round.name}: ${candidateName} — ${jobTitle}`,
        scheduled_at: startDate.toISOString(),
        end_time: endDate.toISOString(),
        duration_minutes: round.durationMinutes || 30,
        meeting_type: 'interview',
        created_by: user?.id,
      });

      if (meetingError) throw meetingError;

      // Log pipeline event
      await (supabase as any).from('pipeline_events').insert({
        application_id: candidate.id,
        job_id: jobId,
        event_type: 'interview_scheduled',
        performed_by: user?.id,
        metadata: {
          round_name: round.name,
          round_index: parseInt(selectedRound),
          scheduled_at: startDate.toISOString(),
        },
      });

      toast.success(t('interview.scheduled', "Interview scheduled: {{round}}", { round: round.name }));
      onScheduled();
      onOpenChange(false);
    } catch (err) {
      toast.error(t('interview.scheduleFailed', 'Failed to schedule interview'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {t('interview.scheduleTitle', 'Schedule Interview')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {candidateName} — {jobTitle}
          </p>

          {rounds.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">{t('interview.round', 'Round')}</Label>
              <Select value={selectedRound} onValueChange={setSelectedRound}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rounds.map((r, i) => (
                    <SelectItem key={i} value={String(i)} className="text-xs">
                      {i + 1}. {r.name} ({r.durationMinutes}min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">{t('interview.dateTime', 'Date & Time')}</Label>
            <Input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            size="sm"
            onClick={handleSchedule}
            disabled={saving || !dateTime}
          >
            {saving ? t('common.scheduling', 'Scheduling...') : t('common.schedule', 'Schedule')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

ScheduleInterviewDialog.displayName = 'ScheduleInterviewDialog';

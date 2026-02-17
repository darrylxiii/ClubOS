import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useSessionJobs } from '@/hooks/useSessionJobs';
import { AlertTriangle } from 'lucide-react';

interface TimeCorrectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionJobId: string;
  sessionId: string;
  originalMinutes: number;
  jobTitle: string;
}

const CORRECTION_TYPES = [
  { label: 'Left running too long', value: 'too_long' },
  { label: 'Ended too early', value: 'too_short' },
  { label: 'Wrong job selected', value: 'wrong_job' },
  { label: 'Split between jobs', value: 'split' },
];

export function TimeCorrectionDialog({
  open,
  onOpenChange,
  sessionJobId,
  sessionId,
  originalMinutes,
  jobTitle,
}: TimeCorrectionDialogProps) {
  const [correctedMinutes, setCorrectedMinutes] = useState(String(originalMinutes));
  const [correctionType, setCorrectionType] = useState('');
  const [reason, setReason] = useState('');
  const { submitCorrection } = useSessionJobs();

  const handleSubmit = () => {
    if (!correctionType || !reason.trim() || !correctedMinutes) return;
    submitCorrection.mutate(
      {
        session_job_id: sessionJobId,
        session_id: sessionId,
        original_minutes: originalMinutes,
        corrected_minutes: parseInt(correctedMinutes),
        reason: reason.trim(),
        correction_type: correctionType,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setReason('');
          setCorrectionType('');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Time Correction
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md bg-muted/50 p-3 text-sm">
            <p className="text-muted-foreground">Job: <span className="text-foreground font-medium">{jobTitle}</span></p>
            <p className="text-muted-foreground">Original logged time: <span className="text-foreground font-medium">{originalMinutes} min</span></p>
          </div>

          <div className="space-y-2">
            <Label>Corrected minutes</Label>
            <Input
              type="number"
              min={0}
              value={correctedMinutes}
              onChange={e => setCorrectedMinutes(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Correction type</Label>
            <Select value={correctionType} onValueChange={setCorrectionType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type…" />
              </SelectTrigger>
              <SelectContent>
                {CORRECTION_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea
              placeholder="e.g. Left session running over lunch"
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!correctionType || !reason.trim() || submitCorrection.isPending}
          >
            {submitCorrection.isPending ? 'Saving…' : 'Save Correction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

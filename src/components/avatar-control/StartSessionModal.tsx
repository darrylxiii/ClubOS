import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AvatarAccount } from '@/hooks/useAvatarAccounts';
import { useAvatarSessions } from '@/hooks/useAvatarSessions';
import { addMinutes, format } from 'date-fns';

interface StartSessionModalProps {
  account: AvatarAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DURATION_OPTIONS = [
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
  { label: '4 hours', value: 240 },
];

export function StartSessionModal({ account, open, onOpenChange }: StartSessionModalProps) {
  const [duration, setDuration] = useState('60');
  const [purpose, setPurpose] = useState('');
  const { startSession } = useAvatarSessions();

  const handleStart = () => {
    if (!account || !purpose.trim()) return;
    const endAt = addMinutes(new Date(), parseInt(duration));
    startSession.mutate(
      { account_id: account.id, expected_end_at: endAt.toISOString(), purpose: purpose.trim() },
      {
        onSuccess: () => {
          onOpenChange(false);
          setPurpose('');
          setDuration('60');
        },
      }
    );
  };

  if (!account) return null;

  const expectedEnd = addMinutes(new Date(), parseInt(duration));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start Session — {account.label}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Session ends at {format(expectedEnd, 'HH:mm')}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Purpose</Label>
            <Input
              placeholder="e.g. DM outreach NL founders"
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
            />
          </div>

          {account.playbook && (
            <div className="rounded-md bg-muted/50 p-3 text-xs space-y-1">
              <p className="font-medium text-foreground">Playbook</p>
              <p className="text-muted-foreground whitespace-pre-wrap">{account.playbook}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleStart} disabled={!purpose.trim() || startSession.isPending}>
            {startSession.isPending ? 'Starting…' : 'Start Session'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

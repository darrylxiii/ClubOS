import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAvatarAccounts } from '@/hooks/useAvatarAccounts';

interface AvatarAccountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AvatarAccountForm({ open, onOpenChange }: AvatarAccountFormProps) {
  const { createAccount } = useAvatarAccounts();
  const [form, setForm] = useState({
    label: '',
    linkedin_email: '',
    owner_team: '',
    max_daily_minutes: 360,
    notes: '',
    playbook: '',
  });

  const handleSubmit = () => {
    if (!form.label.trim()) return;
    createAccount.mutate(
      {
        label: form.label.trim(),
        linkedin_email: form.linkedin_email || null,
        owner_team: form.owner_team || null,
        max_daily_minutes: form.max_daily_minutes,
        notes: form.notes || null,
        playbook: form.playbook || null,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setForm({ label: '', linkedin_email: '', owner_team: '', max_daily_minutes: 360, notes: '', playbook: '' });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add LinkedIn Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Label *</Label>
            <Input placeholder="e.g. Darryl – Growth Avatar #3" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>LinkedIn Email</Label>
              <Input placeholder="email@example.com" value={form.linkedin_email} onChange={e => setForm(f => ({ ...f, linkedin_email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Team / Campaign</Label>
              <Input placeholder="e.g. DACH Outbound" value={form.owner_team} onChange={e => setForm(f => ({ ...f, owner_team: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Max Daily Usage (minutes)</Label>
            <Input type="number" value={form.max_daily_minutes} onChange={e => setForm(f => ({ ...f, max_daily_minutes: parseInt(e.target.value) || 360 }))} />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea placeholder="Positioning, niche, tone of voice…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Playbook</Label>
            <Textarea placeholder="Max connections/day, allowed tools, activity windows…" value={form.playbook} onChange={e => setForm(f => ({ ...f, playbook: e.target.value }))} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!form.label.trim() || createAccount.isPending}>
            {createAccount.isPending ? 'Adding…' : 'Add Account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

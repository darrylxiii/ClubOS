import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Eye, EyeOff, Loader2, Trash2 } from 'lucide-react';
import { AvatarAccount, useAvatarAccounts } from '@/hooks/useAvatarAccounts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EditAvatarAccountDialogProps {
  account: AvatarAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditAvatarAccountDialog({ account, open, onOpenChange }: EditAvatarAccountDialogProps) {
  const { updateAccount, saveCredentials, deleteAccount } = useAvatarAccounts();

  const [label, setLabel] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [linkedinEmail, setLinkedinEmail] = useState('');
  const [ownerTeam, setOwnerTeam] = useState('');
  const [status, setStatus] = useState('available');
  const [riskLevel, setRiskLevel] = useState('low');
  const [maxDailyMinutes, setMaxDailyMinutes] = useState(120);
  const [weeklyConnectionLimit, setWeeklyConnectionLimit] = useState(100);
  const [weeklyConnectionsSent, setWeeklyConnectionsSent] = useState(0);
  const [notes, setNotes] = useState('');
  const [playbook, setPlaybook] = useState('');
  const [emailAccountAddress, setEmailAccountAddress] = useState('');

  // Password fields
  const [linkedinPassword, setLinkedinPassword] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [showLinkedinPw, setShowLinkedinPw] = useState(false);
  const [showEmailPw, setShowEmailPw] = useState(false);
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (account && open) {
      setLabel(account.label || '');
      setLinkedinUrl(account.linkedin_url || '');
      setLinkedinEmail(account.linkedin_email || '');
      setOwnerTeam(account.owner_team || '');
      setStatus(account.status || 'available');
      setRiskLevel(account.risk_level || 'low');
      setMaxDailyMinutes(account.max_daily_minutes ?? 120);
      setNotes(account.notes || '');
      setPlaybook(account.playbook || '');
      setEmailAccountAddress(account.email_account_address || '');
      setLinkedinPassword('');
      setEmailPassword('');
      setShowLinkedinPw(false);
      setShowEmailPw(false);

      // Fetch encrypted passwords
      setLoadingCredentials(true);
      supabase
        .from('linkedin_avatar_accounts')
        .select('linkedin_password_encrypted, email_account_password_encrypted')
        .eq('id', account.id)
        .single()
        .then(({ data }) => {
          if (data) {
            try {
              if ((data as any).linkedin_password_encrypted) setLinkedinPassword(atob((data as any).linkedin_password_encrypted));
            } catch { /* ignore decode errors */ }
            try {
              if ((data as any).email_account_password_encrypted) setEmailPassword(atob((data as any).email_account_password_encrypted));
            } catch { /* ignore */ }
          }
          setLoadingCredentials(false);
        }, () => setLoadingCredentials(false));
    }
  }, [account, open]);

  const handleSave = async () => {
    if (!account) return;
    setSaving(true);
    try {
      // Include email_account_address in the direct DB update
      await updateAccount.mutateAsync({
        id: account.id,
        label,
        linkedin_url: linkedinUrl || null,
        linkedin_email: linkedinEmail || null,
        owner_team: ownerTeam || null,
        status,
        risk_level: riskLevel,
        max_daily_minutes: maxDailyMinutes,
        notes: notes || null,
        playbook: playbook || null,
        email_account_address: emailAccountAddress || null,
      });

      // Always save credentials via edge function when passwords are present
      if (linkedinPassword || emailPassword) {
        try {
          await saveCredentials.mutateAsync({
            accountId: account.id,
            linkedinPassword: linkedinPassword || undefined,
            emailAccountPassword: emailPassword || undefined,
          });
        } catch (credErr: any) {
          toast.error(`Credentials save failed: ${credErr.message}`);
          // Don't block dialog close since main profile saved
        }
      }

      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Account</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Label</Label>
              <Input value={label} onChange={e => setLabel(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Owner / Team</Label>
              <Input value={ownerTeam} onChange={e => setOwnerTeam(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">LinkedIn URL</Label>
            <Input value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/..." />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">LinkedIn Email</Label>
            <Input value={linkedinEmail} onChange={e => setLinkedinEmail(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="banned">Banned</SelectItem>
                  <SelectItem value="needs_review">Needs Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Risk Level</Label>
              <Select value={riskLevel} onValueChange={setRiskLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Max Daily Minutes</Label>
            <Input type="number" value={maxDailyMinutes} onChange={e => setMaxDailyMinutes(Number(e.target.value))} />
          </div>

          {/* Credentials section */}
          <div className="border-t pt-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Credentials</p>

            <div className="space-y-1.5">
              <Label className="text-xs">LinkedIn Password</Label>
              <div className="relative">
                <Input
                  type={showLinkedinPw ? 'text' : 'password'}
                  value={loadingCredentials ? '••••••' : linkedinPassword}
                  onChange={e => setLinkedinPassword(e.target.value)}
                  disabled={loadingCredentials}
                  className="pr-9"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full w-9"
                  onClick={() => setShowLinkedinPw(v => !v)}
                  disabled={loadingCredentials}
                >
                  {showLinkedinPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Email Account Address</Label>
              <Input value={emailAccountAddress} onChange={e => setEmailAccountAddress(e.target.value)} placeholder="backup@email.com" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Email Account Password</Label>
              <div className="relative">
                <Input
                  type={showEmailPw ? 'text' : 'password'}
                  value={loadingCredentials ? '••••••' : emailPassword}
                  onChange={e => setEmailPassword(e.target.value)}
                  disabled={loadingCredentials}
                  className="pr-9"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full w-9"
                  onClick={() => setShowEmailPw(v => !v)}
                  disabled={loadingCredentials}
                >
                  {showEmailPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Playbook</Label>
            <Textarea rows={2} value={playbook} onChange={e => setPlaybook(e.target.value)} />
          </div>

          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="shrink-0">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete "{account?.label}" and all associated session history. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      if (account) {
                        deleteAccount.mutate(account.id, {
                          onSuccess: () => onOpenChange(false),
                        });
                      }
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button className="flex-1" onClick={handleSave} disabled={saving || !label}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

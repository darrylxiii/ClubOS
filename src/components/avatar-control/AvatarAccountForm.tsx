import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Lock, Eye, EyeOff } from 'lucide-react';
import { useAvatarAccounts } from '@/hooks/useAvatarAccounts';
import { toast } from 'sonner';

interface AvatarAccountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AvatarAccountForm({ open, onOpenChange }: AvatarAccountFormProps) {
  const { t } = useTranslation('common');
  const { createAccount, syncLinkedIn, saveCredentials } = useAvatarAccounts();
  const [syncing, setSyncing] = useState(false);
  const [showLinkedinPw, setShowLinkedinPw] = useState(false);
  const [showEmailPw, setShowEmailPw] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    label: '',
    linkedin_url: '',
    linkedin_email: '',
    owner_team: '',
    max_daily_minutes: 360,
    notes: '',
    playbook: '',
    linkedin_password: '',
    email_account_address: '',
    email_account_password: '',
  });

  const resetForm = () => {
    setForm({
      label: '', linkedin_url: '', linkedin_email: '', owner_team: '',
      max_daily_minutes: 360, notes: '', playbook: '',
      linkedin_password: '', email_account_address: '', email_account_password: '',
    });
  };

  const handleSubmit = async () => {
    if (!form.label.trim() || saving) return;
    setSaving(true);

    createAccount.mutate(
      {
        label: form.label.trim(),
        linkedin_email: form.linkedin_email || null,
        linkedin_url: form.linkedin_url || null,
        owner_team: form.owner_team || null,
        max_daily_minutes: form.max_daily_minutes,
        notes: form.notes || null,
        playbook: form.playbook || null,
        email_account_address: form.email_account_address || null,
      },
      {
        onSuccess: async (data) => {
          const accountId = (data as any)?.id;
          if (!accountId) {
            setSaving(false);
            onOpenChange(false);
            resetForm();
            return;
          }

          // Save credentials if provided -- await to ensure they persist
          if (form.linkedin_password || form.email_account_password) {
            try {
              await saveCredentials.mutateAsync({
                accountId,
                linkedinPassword: form.linkedin_password || undefined,
                emailAccountPassword: form.email_account_password || undefined,
              });
            } catch (credErr: any) {
              toast.error(`Credentials save failed: ${credErr.message}`);
            }
          }

          // Trigger LinkedIn sync if URL provided
          if (form.linkedin_url.trim()) {
            toast.info(t("syncing_linkedin_profile_data", "Syncing LinkedIn profile data…"));
            syncLinkedIn.mutate(
              { accountId, linkedinUrl: form.linkedin_url.trim() },
              {
                onSettled: () => {
                  setSaving(false);
                  onOpenChange(false);
                  resetForm();
                },
              }
            );
          } else {
            setSaving(false);
            onOpenChange(false);
            resetForm();
          }
        },
        onError: () => {
          setSaving(false);
        },
      }
    );
  };

  const set = (key: string, value: string | number) => setForm(f => ({ ...f, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("add_linkedin_account", "Add LinkedIn Account")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          {/* Section 1: Identity */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("identity", "Identity")}</p>
            <div className="space-y-2">
              <Label>{t("label", "Label *")}</Label>
              <Input placeholder={t("eg_darryl_growth_avatar", "e.g. Darryl – Growth Avatar #3")} value={form.label} onChange={e => set('label', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("linkedin_profile_url", "LinkedIn Profile URL")}</Label>
              <Input
                placeholder="https://linkedin.com/in/username"
                value={form.linkedin_url}
                onChange={e => set('linkedin_url', e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">Profile picture, headline, connections and followers will be synced automatically after saving.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("linkedin_email", "LinkedIn Email")}</Label>
                <Input placeholder={t("emailexamplecom", "email@example.com")} value={form.linkedin_email} onChange={e => set('linkedin_email', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("team_campaign", "Team / Campaign")}</Label>
                <Input placeholder={t("eg_dach_outbound", "e.g. DACH Outbound")} value={form.owner_team} onChange={e => set('owner_team', e.target.value)} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 2: Credentials */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="h-3 w-3" /> Credentials
            </p>
            <p className="text-[11px] text-muted-foreground">{t("passwords_are_encrypted_at", "Passwords are encrypted at rest and only accessible by admins.")}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("linkedin_password", "LinkedIn Password")}</Label>
                <div className="relative">
                  <Input
                    type={showLinkedinPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.linkedin_password}
                    onChange={e => set('linkedin_password', e.target.value)}
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLinkedinPw(!showLinkedinPw)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showLinkedinPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("email_account_address", "Email Account Address")}</Label>
                <Input placeholder={t("accountgmailcom", "account@gmail.com")} value={form.email_account_address} onChange={e => set('email_account_address', e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("email_account_password", "Email Account Password")}</Label>
              <div className="relative max-w-[calc(50%-6px)]">
                <Input
                  type={showEmailPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.email_account_password}
                  onChange={e => set('email_account_password', e.target.value)}
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowEmailPw(!showEmailPw)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showEmailPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 3: Operations */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("operations", "Operations")}</p>
            <div className="space-y-2">
              <Label>{t("max_daily_usage_minutes", "Max Daily Usage (minutes)")}</Label>
              <Input type="number" value={form.max_daily_minutes} onChange={e => set('max_daily_minutes', parseInt(e.target.value) || 360)} />
            </div>
            <div className="space-y-2">
              <Label>{t("notes", "Notes")}</Label>
              <Textarea placeholder={t("positioning_niche_tone_of", "Positioning, niche, tone of voice…")} value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>{t("playbook", "Playbook")}</Label>
              <Textarea placeholder={t("max_connectionsday_allowed_tools", "Max connections/day, allowed tools, activity windows…")} value={form.playbook} onChange={e => set('playbook', e.target.value)} rows={3} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel", "Cancel")}</Button>
          <Button onClick={handleSubmit} disabled={!form.label.trim() || saving}>
            {saving ? 'Adding…' : 'Add Account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

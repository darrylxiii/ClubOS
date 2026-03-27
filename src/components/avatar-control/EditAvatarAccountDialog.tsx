import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Eye, EyeOff, Loader2, Trash2, Linkedin, Twitter, MessageSquare, Instagram, Upload, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AvatarAccount, useAvatarAccounts } from '@/hooks/useAvatarAccounts';
import { useAvatarSocialTargets, SOCIAL_PLATFORMS, SocialPlatform } from '@/hooks/useAvatarSocialTargets';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { versionedAvatarUrl } from '@/lib/avatar-url';

interface EditAvatarAccountDialogProps {
  account: AvatarAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditAvatarAccountDialog({ account, open, onOpenChange }: EditAvatarAccountDialogProps) {
  const { t } = useTranslation('common');
  const { updateAccount, saveCredentials, deleteAccount, resetConnectionCounter } = useAvatarAccounts();
  const { targets, upsertSocialTarget } = useAvatarSocialTargets(account?.id);

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
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);
  // Social platform local state
  const [socialState, setSocialState] = useState<Record<SocialPlatform, { active: boolean; handle: string; target: number }>>({
    linkedin: { active: false, handle: '', target: 3 },
    twitter: { active: false, handle: '', target: 3 },
    reddit: { active: false, handle: '', target: 3 },
    instagram: { active: false, handle: '', target: 3 },
  });

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
      setWeeklyConnectionLimit(account.weekly_connection_limit ?? 100);
      setWeeklyConnectionsSent(account.weekly_connections_sent ?? 0);
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

  // Sync social state from fetched targets
  useEffect(() => {
    if (targets.length > 0 && account) {
      const newState = { ...socialState };
      SOCIAL_PLATFORMS.forEach(p => {
        const t = targets.find(tt => tt.platform === p.value);
        if (t) {
          newState[p.value] = { active: t.is_active, handle: t.platform_handle || '', target: t.weekly_target };
        } else {
          newState[p.value] = { active: false, handle: '', target: 3 };
        }
      });
      setSocialState(newState);
    }
  }, [targets, account]);

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
        weekly_connection_limit: weeklyConnectionLimit,
        weekly_connections_sent: weeklyConnectionsSent,
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

      // Save social targets
      for (const p of SOCIAL_PLATFORMS) {
        const s = socialState[p.value];
        if (s.active || targets.find(t => t.platform === p.value)) {
          await upsertSocialTarget.mutateAsync({
            account_id: account.id,
            platform: p.value,
            is_active: s.active,
            platform_handle: s.handle || null,
            weekly_target: s.target,
          });
        }
      }

      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !account) return;
    if (!file.type.startsWith('image/')) { toast.error(t("please_select_an_image", "Please select an image file")); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error(t("image_must_be_under", "Image must be under 5MB")); return; }

    setAvatarUploading(true);
    try {
      const ext = file.type.includes('png') ? 'png' : file.type.includes('webp') ? 'webp' : 'jpg';
      const filePath = `linkedin-avatars/${account.id}.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(filePath, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const newUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      await supabase.from('linkedin_avatar_accounts').update({ avatar_url: newUrl }).eq('id', account.id);
      toast.success(t("avatar_updated", "Avatar updated"));
      // Trigger refetch via invalidation handled by the hook
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setAvatarUploading(false);
      if (avatarFileRef.current) avatarFileRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("edit_account", "Edit Account")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Avatar upload */}
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border border-border">
              {avatarUploading ? (
                <AvatarFallback><Loader2 className="h-5 w-5 animate-spin" /></AvatarFallback>
              ) : account?.avatar_url ? (
                <AvatarImage src={versionedAvatarUrl(account.avatar_url, account.last_synced_at)} alt={account.label} className="object-cover" />
              ) : (
                <AvatarFallback><User className="h-6 w-6 text-muted-foreground" /></AvatarFallback>
              )}
            </Avatar>
            <div className="space-y-1">
              <input ref={avatarFileRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={avatarUploading} />
              <Button variant="outline" size="sm" onClick={() => avatarFileRef.current?.click()} disabled={avatarUploading}>
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                {account?.avatar_url ? 'Change' : 'Upload'} Photo
              </Button>
              <p className="text-[11px] text-muted-foreground">{t("jpg_png_or_webp", "JPG, PNG or WEBP. Max 5MB.")}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("label", "Label")}</Label>
              <Input value={label} onChange={e => setLabel(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("owner_team", "Owner / Team")}</Label>
              <Input value={ownerTeam} onChange={e => setOwnerTeam(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t("linkedin_url", "LinkedIn URL")}</Label>
            <Input value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/..." />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t("linkedin_email", "LinkedIn Email")}</Label>
            <Input value={linkedinEmail} onChange={e => setLinkedinEmail(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("status", "Status")}</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">{t("available", "Available")}</SelectItem>
                  <SelectItem value="paused">{t("paused", "Paused")}</SelectItem>
                  <SelectItem value="banned">{t("banned", "Banned")}</SelectItem>
                  <SelectItem value="needs_review">{t("needs_review", "Needs Review")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("risk_level", "Risk Level")}</Label>
              <Select value={riskLevel} onValueChange={setRiskLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t("low", "Low")}</SelectItem>
                  <SelectItem value="medium">{t("medium", "Medium")}</SelectItem>
                  <SelectItem value="high">{t("high", "High")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t("max_daily_minutes", "Max Daily Minutes")}</Label>
            <Input type="number" value={maxDailyMinutes} onChange={e => setMaxDailyMinutes(Number(e.target.value))} />
          </div>

          {/* Connection Request Quota */}
          <div className="border-t pt-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("connection_request_quota", "Connection Request Quota")}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t("weekly_limit", "Weekly Limit")}</Label>
                <Input type="number" value={weeklyConnectionLimit} onChange={e => setWeeklyConnectionLimit(Number(e.target.value))} min={0} max={500} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("sent_this_week", "Sent This Week")}</Label>
                <Input type="number" value={weeklyConnectionsSent} onChange={e => setWeeklyConnectionsSent(Number(e.target.value))} min={0} />
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                if (account) resetConnectionCounter.mutate(account.id);
                setWeeklyConnectionsSent(0);
              }}
              disabled={resetConnectionCounter.isPending}
            >
              Reset Counter to Zero
            </Button>
          </div>

          {/* Social Platforms */}
          <div className="border-t pt-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("social_platforms", "Social Platforms")}</p>
            {SOCIAL_PLATFORMS.map(p => {
              const Icon = p.value === 'linkedin' ? Linkedin : p.value === 'twitter' ? Twitter : p.value === 'reddit' ? MessageSquare : Instagram;
              const s = socialState[p.value];
              return (
                <div key={p.value} className="space-y-2 rounded-lg border border-border/30 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${p.color}`} />
                      <span className="text-sm font-medium">{p.label}</span>
                    </div>
                    <Switch
                      checked={s.active}
                      onCheckedChange={(checked) =>
                        setSocialState(prev => ({ ...prev, [p.value]: { ...prev[p.value], active: checked } }))
                      }
                    />
                  </div>
                  {s.active && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px]">{t("handle", "Handle")}</Label>
                        <Input
                          className="h-8 text-xs"
                          placeholder={p.value === 'reddit' ? 'u/username' : '@username'}
                          value={s.handle}
                          onChange={e => setSocialState(prev => ({ ...prev, [p.value]: { ...prev[p.value], handle: e.target.value } }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px]">{t("weekly_target", "Weekly Target")}</Label>
                        <Input
                          type="number"
                          className="h-8 text-xs"
                          min={1}
                          max={50}
                          value={s.target}
                          onChange={e => setSocialState(prev => ({ ...prev, [p.value]: { ...prev[p.value], target: Number(e.target.value) } }))}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Credentials section */}
          <div className="border-t pt-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("credentials", "Credentials")}</p>

            <div className="space-y-1.5">
              <Label className="text-xs">{t("linkedin_password", "LinkedIn Password")}</Label>
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
              <Label className="text-xs">{t("email_account_address", "Email Account Address")}</Label>
              <Input value={emailAccountAddress} onChange={e => setEmailAccountAddress(e.target.value)} placeholder={t("backupemailcom", "backup@email.com")} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t("email_account_password", "Email Account Password")}</Label>
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
            <Label className="text-xs">{t("notes", "Notes")}</Label>
            <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t("playbook", "Playbook")}</Label>
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
                  <AlertDialogTitle>{t("delete_account", "Delete account?")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete "{account?.label}" and all associated session history. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("cancel", "Cancel")}</AlertDialogCancel>
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

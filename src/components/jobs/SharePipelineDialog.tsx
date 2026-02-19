import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';
import {
  Copy,
  ExternalLink,
  Link2,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  Users,
  Clock,
  Plus,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// password_hash is never returned to the frontend — use is_password_protected boolean instead
interface ShareLink {
  id: string;
  token: string;
  label: string | null;
  expires_at: string;
  view_count: number;
  is_active: boolean;
  is_password_protected: boolean;
  created_at: string;
}

interface SharePipelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobTitle: string;
}

const EXPIRY_OPTIONS = [
  { label: '24 hours', hours: 24 },
  { label: '48 hours', hours: 48 },
  { label: '72 hours', hours: 72 },
  { label: '7 days', hours: 168 },
  { label: '30 days', hours: 720 },
];

const MIN_PASSWORD_LENGTH = 8;

export function SharePipelineDialog({
  open,
  onOpenChange,
  jobId,
  jobTitle,
}: SharePipelineDialogProps) {
  const [shares, setShares] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);

  // Form state
  const [label, setLabel] = useState('');
  const [expiryHours, setExpiryHours] = useState(72);
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Visibility toggles
  const [showNames, setShowNames] = useState(true);
  const [showEmails, setShowEmails] = useState(false);
  const [showLinkedin, setShowLinkedin] = useState(false);
  const [showSalary, setShowSalary] = useState(false);
  const [showMatchScores, setShowMatchScores] = useState(true);
  const [showAiSummary, setShowAiSummary] = useState(true);

  const [newLink, setNewLink] = useState<string | null>(null);

  useEffect(() => {
    if (open) fetchShares();
  }, [open, jobId]);

  const fetchShares = async () => {
    setLoading(true);
    // Explicitly exclude password_hash — never send it to the browser
    const { data, error } = await (supabase as any)
      .from('job_pipeline_shares')
      .select(
        'id, token, label, expires_at, view_count, is_active, is_password_protected, created_at',
      )
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (!error) setShares((data as ShareLink[]) || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (passwordEnabled) {
      if (!password.trim()) {
        toast.error('Please enter a password or disable password protection.');
        return;
      }
      if (password.trim().length < MIN_PASSWORD_LENGTH) {
        toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
        return;
      }
    }

    setCreating(true);
    try {
      const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let passwordHash: string | null = null;

      if (passwordEnabled && password.trim()) {
        // Use SECURITY DEFINER RPC to hash password server-side — never store plaintext
        const { data: hashData, error: hashError } = await (supabase as any).rpc(
          'hash_pipeline_share_password',
          { _password: password.trim() },
        );
        if (hashError || !hashData) {
          throw new Error('Failed to hash password. Please try again.');
        }
        passwordHash = hashData as string;
      }

      const payload = {
        job_id: jobId,
        created_by: user.id,
        expires_at: expiresAt,
        label: label.trim() || null,
        show_candidate_names: showNames,
        show_candidate_emails: showEmails,
        show_candidate_linkedin: showLinkedin,
        show_salary_data: showSalary,
        show_match_scores: showMatchScores,
        show_ai_summary: showAiSummary,
        show_contact_info: showEmails || showLinkedin,
        password_hash: passwordHash,
        is_password_protected: passwordEnabled && !!passwordHash,
      };

      const { data: share, error } = await (supabase as any)
        .from('job_pipeline_shares')
        .insert(payload)
        .select('token')
        .single();

      if (error) throw error;

      const link = `${window.location.origin}/pipeline/${share.token}`;
      setNewLink(link);
      await navigator.clipboard.writeText(link);
      toast.success('Share link copied to clipboard.');
      await fetchShares();

      setShowCreateForm(false);
      setLabel('');
      setPassword('');
      setPasswordEnabled(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create share link.');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (shareId: string) => {
    const { error } = await (supabase as any)
      .from('job_pipeline_shares')
      .update({ is_active: false })
      .eq('id', shareId);

    if (error) {
      toast.error('Failed to revoke link.');
    } else {
      toast.success('Share link revoked.');
      await fetchShares();
    }
    setRevokeTarget(null);
  };

  const copyLink = async (token: string) => {
    const link = `${window.location.origin}/pipeline/${token}`;
    await navigator.clipboard.writeText(link);
    toast.success('Link copied to clipboard.');
  };

  const activeShares = shares.filter((s) => s.is_active && new Date(s.expires_at) > new Date());
  const expiredShares = shares.filter((s) => !s.is_active || new Date(s.expires_at) <= new Date());

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/30">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Link2 className="w-5 h-5 text-primary" />
              Share Pipeline
              {activeShares.length > 0 && (
                <Badge variant="secondary" className="text-xs ml-1">
                  {activeShares.length} active
                </Badge>
              )}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Generate a secure, read-only link for{' '}
              <span className="font-medium text-foreground">{jobTitle}</span>
            </p>
          </DialogHeader>

          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-6">
              {/* Newly created link banner */}
              {newLink && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                    Link created
                  </p>
                  <div className="flex items-center gap-2">
                    <Input value={newLink} readOnly className="text-xs h-8 bg-background/50" />
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 h-8"
                      onClick={() => {
                        navigator.clipboard.writeText(newLink);
                        toast.success('Copied.');
                      }}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 h-8"
                      onClick={() => window.open(newLink, '_blank')}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Create new link section */}
              {!showCreateForm ? (
                <Button className="w-full gap-2" onClick={() => setShowCreateForm(true)}>
                  <Plus className="w-4 h-4" />
                  Generate New Share Link
                </Button>
              ) : (
                <div className="space-y-4 rounded-xl border border-border/40 bg-card/50 p-4">
                  <p className="text-sm font-semibold text-foreground">New share link</p>

                  {/* Label */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Label (optional)</Label>
                    <Input
                      placeholder="e.g. Sent to Acme HR team"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>

                  {/* Expiry */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Expires after</Label>
                    <Select
                      value={String(expiryHours)}
                      onValueChange={(v) => setExpiryHours(Number(v))}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPIRY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.hours} value={String(opt.hours)}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Password protection */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" />
                        Password protection
                      </Label>
                      <Switch
                        checked={passwordEnabled}
                        onCheckedChange={(v) => {
                          setPasswordEnabled(v);
                          if (!v) setPassword('');
                        }}
                      />
                    </div>
                    {passwordEnabled && (
                      <div className="space-y-1">
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder={`Min ${MIN_PASSWORD_LENGTH} characters`}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-8 text-sm pr-9"
                          />
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowPassword((v) => !v)}
                          >
                            {showPassword ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        {password.trim().length > 0 && password.trim().length < MIN_PASSWORD_LENGTH && (
                          <p className="text-xs text-destructive">
                            Password must be at least {MIN_PASSWORD_LENGTH} characters.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Visibility controls */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      What to show
                    </p>
                    {[
                      { label: 'Candidate names', value: showNames, set: setShowNames },
                      { label: 'Email addresses', value: showEmails, set: setShowEmails },
                      { label: 'LinkedIn profiles', value: showLinkedin, set: setShowLinkedin },
                      { label: 'Match scores', value: showMatchScores, set: setShowMatchScores },
                      { label: 'AI summaries', value: showAiSummary, set: setShowAiSummary },
                      { label: 'Salary data', value: showSalary, set: setShowSalary },
                    ].map(({ label, value, set }) => (
                      <div key={label} className="flex items-center justify-between py-0.5">
                        <Label className="text-xs text-muted-foreground">{label}</Label>
                        <Switch checked={value} onCheckedChange={set} className="scale-75" />
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setShowCreateForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={handleCreate}
                      disabled={creating}
                    >
                      {creating ? (
                        'Creating...'
                      ) : (
                        <>
                          <Link2 className="w-3.5 h-3.5" />
                          Generate Link
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Active shares */}
              {activeShares.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Active links ({activeShares.length})
                  </p>
                  {activeShares.map((share) => (
                    <ShareLinkRow
                      key={share.id}
                      share={share}
                      onCopy={copyLink}
                      onRevoke={(id) => setRevokeTarget(id)}
                    />
                  ))}
                </div>
              )}

              {/* Expired/revoked shares */}
              {expiredShares.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Expired / revoked
                  </p>
                  {expiredShares.map((share) => (
                    <ShareLinkRow
                      key={share.id}
                      share={share}
                      onCopy={copyLink}
                      onRevoke={(id) => setRevokeTarget(id)}
                      inactive
                    />
                  ))}
                </div>
              )}

              {!loading && shares.length === 0 && !showCreateForm && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No share links created yet.
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Revoke confirmation */}
      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
        title="Revoke share link?"
        description="Anyone currently viewing this link will immediately lose access. This cannot be undone."
        confirmText="Revoke"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={() => revokeTarget && handleRevoke(revokeTarget)}
      />
    </>
  );
}

function ShareLinkRow({
  share,
  onCopy,
  onRevoke,
  inactive = false,
}: {
  share: ShareLink;
  onCopy: (token: string) => void;
  onRevoke: (id: string) => void;
  inactive?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 space-y-2 transition-colors ${
        inactive ? 'border-border/20 bg-muted/10 opacity-60' : 'border-border/30 bg-card/40'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {share.label && (
              <span className="text-sm font-medium text-foreground truncate">{share.label}</span>
            )}
            {share.is_password_protected && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 gap-0.5">
                <Lock className="w-2.5 h-2.5" />
                Protected
              </Badge>
            )}
            {inactive && (
              <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                {!share.is_active ? 'Revoked' : 'Expired'}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {share.view_count} view{share.view_count !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {inactive
                ? 'Expired'
                : `Expires ${formatDistanceToNow(new Date(share.expires_at), { addSuffix: true })}`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!inactive && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => onCopy(share.token)}
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() =>
                  window.open(`${window.location.origin}/pipeline/${share.token}`, '_blank')
                }
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => onRevoke(share.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

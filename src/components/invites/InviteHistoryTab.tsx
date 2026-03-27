import { useTranslation } from 'react-i18next';
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Clock, CheckCircle, XCircle, Copy, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface InviteRecord {
  id: string;
  code: string;
  invite_type: string | null;
  target_role: string | null;
  is_active: boolean;
  uses_count: number | null;
  max_uses: number | null;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  metadata: Record<string, unknown> | null;
}

export function InviteHistoryTab() {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);

  const { data: invites = [], isLoading } = useQuery<InviteRecord[]>({
    queryKey: ['invite-history', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('invite_codes')
        .select('id, code, invite_type, target_role, is_active, uses_count, max_uses, created_at, expires_at, used_at, metadata')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as InviteRecord[];
    },
    enabled: !!user,
    staleTime: 30000,
  });

  const revokeInvite = async (id: string) => {
    try {
      const { error } = await supabase
        .from('invite_codes')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      toast.success(t("invitation_revoked", "Invitation revoked"));
      queryClient.invalidateQueries({ queryKey: ['invite-history'] });
      queryClient.invalidateQueries({ queryKey: ['invite-stats'] });
    } catch {
      toast.error(t("failed_to_revoke_invitation", "Failed to revoke invitation"));
    } finally {
      setRevokeTarget(null);
    }
  };

  const copyInviteLink = (code: string) => {
    const siteUrl = window.location.origin;
    navigator.clipboard.writeText(`${siteUrl}/auth?invite=${code}`);
    toast.success(t("invite_link_copied_to", "Invite link copied to clipboard"));
  };

  const resendInvite = async (invite: InviteRecord) => {
    if (!user) return;
    setResendingId(invite.id);
    try {
      const metadata = invite.metadata || {};
      const recipientEmail = (metadata.email as string) || (metadata.invited_email as string);
      if (!recipientEmail) {
        toast.error(t("no_email_found_for", "No email found for this invite"));
        return;
      }

      // Extend expiry by 7 days from now
      const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await supabase
        .from('invite_codes')
        .update({ expires_at: newExpiry })
        .eq('id', invite.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const { data: membership } = await supabase
        .from('company_members')
        .select('company_id, companies(id, name)')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      const companyName = (membership?.companies as { name?: string })?.name || 'The Quantum Club';

      const { error } = await supabase.functions.invoke('send-team-invite', {
        body: {
          email: recipientEmail,
          inviteCode: invite.code,
          companyId: membership?.company_id || undefined,
          companyName,
          inviterName: profile?.full_name || 'A team member',
          role: invite.target_role || 'member',
          recipientName: (metadata.recipient_name as string) || undefined,
          customMessage: (metadata.custom_message as string) || undefined,
        }
      });

      if (error) throw error;
      toast.success(`Invitation resent to ${recipientEmail}`);
      queryClient.invalidateQueries({ queryKey: ['invite-history'] });
    } catch {
      toast.error(t("failed_to_resend_invitation", "Failed to resend invitation"));
    } finally {
      setResendingId(null);
    }
  };

  const getStatus = (invite: InviteRecord) => {
    if (invite.used_at || (invite.uses_count && invite.max_uses && invite.uses_count >= invite.max_uses)) {
      return { label: 'Used', variant: 'default' as const, icon: CheckCircle };
    }
    if (!invite.is_active) {
      return { label: 'Revoked', variant: 'destructive' as const, icon: XCircle };
    }
    if (new Date(invite.expires_at) < new Date()) {
      return { label: 'Expired', variant: 'secondary' as const, icon: Clock };
    }
    return { label: 'Pending', variant: 'outline' as const, icon: Clock };
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (invites.length === 0) {
    return (
      <div className="text-center py-12">
        <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-1">{t("no_invitations_yet", "No invitations yet")}</h3>
        <p className="text-muted-foreground text-sm">
          Invitations you send will appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {invites.map((invite) => {
          const status = getStatus(invite);
          const StatusIcon = status.icon;
          const metadata = invite.metadata || {};
          const recipientName = (metadata.recipient_name as string) || null;
          const email = (metadata.email as string) || (metadata.invited_email as string) || '—';
          const isPending = status.label === 'Pending';

          return (
            <div
              key={invite.id}
              className="flex items-center justify-between p-4 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <StatusIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {recipientName ? `${recipientName} · ${email}` : email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {invite.target_role && (
                      <span className="capitalize">{invite.target_role} · </span>
                    )}
                    {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Badge variant={status.variant}>{status.label}</Badge>
                {isPending && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyInviteLink(invite.code)}
                      className="h-7 px-2 text-muted-foreground"
                      title={t("copy_invite_link", "Copy invite link")}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => resendInvite(invite)}
                      disabled={resendingId === invite.id}
                      className="h-7 px-2 text-muted-foreground"
                      title={t("resend_invitation", "Resend invitation")}
                    >
                      {resendingId === invite.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRevokeTarget(invite.id)}
                      className="h-7 px-2 text-muted-foreground hover:text-destructive"
                      title={t("revoke_invitation", "Revoke invitation")}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("revoke_this_invitation", "Revoke this invitation?")}</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently deactivate the invite code. The recipient will no longer be able to use it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeTarget && revokeInvite(revokeTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

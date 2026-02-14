import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Clock, CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

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
  metadata: any;
}

export function InviteHistoryTab() {
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvites();
  }, []);

  const loadInvites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('invite_codes')
        .select('id, code, invite_type, target_role, is_active, uses_count, max_uses, created_at, expires_at, used_at, metadata')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setInvites(data || []);
    } catch (error) {
      console.error('Error loading invites:', error);
      toast.error('Failed to load invitation history');
    } finally {
      setLoading(false);
    }
  };

  const revokeInvite = async (id: string) => {
    try {
      const { error } = await supabase
        .from('invite_codes')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      toast.success('Invitation revoked');
      loadInvites();
    } catch (error) {
      toast.error('Failed to revoke invitation');
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

  if (loading) {
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
        <h3 className="text-lg font-semibold mb-1">No invitations yet</h3>
        <p className="text-muted-foreground text-sm">
          Invitations you send will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {invites.map((invite) => {
        const status = getStatus(invite);
        const StatusIcon = status.icon;
        const email = (invite.metadata as any)?.email || (invite.metadata as any)?.invited_email || '—';

        return (
          <div
            key={invite.id}
            className="flex items-center justify-between p-4 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <StatusIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{email}</p>
                <p className="text-xs text-muted-foreground">
                  {invite.target_role && (
                    <span className="capitalize">{invite.target_role} · </span>
                  )}
                  {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={status.variant}>{status.label}</Badge>
              {status.label === 'Pending' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => revokeInvite(invite.id)}
                  className="h-7 px-2 text-muted-foreground hover:text-destructive"
                >
                  <XCircle className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

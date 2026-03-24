import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SetPasswordDialog } from "./SetPasswordDialog";
import { toast } from "sonner";
import { KeyRound, Link2, RefreshCw, Mail, Copy, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ProvisionedPartner {
  id: string;
  provisioned_user_id: string | null;
  provision_method: string;
  created_at: string | null;
  first_login_at: string | null;
  welcome_email_sent: boolean | null;
  invite_code_generated: string | null;
  company_id: string | null;
  profile: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  company: {
    name: string;
  } | null;
}

export function ProvisionedPartnersTab() {
  const [passwordDialog, setPasswordDialog] = useState<{
    open: boolean;
    userId: string;
    name: string;
    email: string;
  }>({ open: false, userId: "", name: "", email: "" });

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: partners, isLoading, refetch } = useQuery({
    queryKey: ["provisioned-partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_provisioning_logs")
        .select(`
          id,
          provisioned_user_id,
          provision_method,
          created_at,
          first_login_at,
          welcome_email_sent,
          invite_code_generated,
          company_id
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles and companies for each partner
      const enriched: ProvisionedPartner[] = await Promise.all(
        (data || []).map(async (log) => {
          let profile = null;
          let company = null;

          if (log.provisioned_user_id) {
            const { data: p } = await supabase
              .from("profiles")
              .select("full_name, email, avatar_url")
              .eq("id", log.provisioned_user_id)
              .maybeSingle();
            profile = p;
          }

          if (log.company_id) {
            const { data: c } = await supabase
              .from("companies")
              .select("name")
              .eq("id", log.company_id)
              .maybeSingle();
            company = c;
          }

          return { ...log, profile, company };
        })
      );

      return enriched;
    },
  });

  const handleAction = async (
    userId: string,
    action: "regenerate_magic_link" | "resend_welcome"
  ) => {
    setActionLoading(`${userId}-${action}`);
    try {
      const { data, error } = await supabase.functions.invoke(
        "admin-manage-provisioned-user",
        { body: { action, target_user_id: userId } }
      );

      if (error || data?.error) {
        toast.error(data?.error || "Action failed. Please try again.");
        return;
      }

      if (action === "regenerate_magic_link" && data?.magic_link) {
        await navigator.clipboard.writeText(data.magic_link);
        toast.success("Magic link generated and copied to clipboard.");
      } else if (action === "resend_welcome") {
        toast.success("Welcome email resent.");
      }

      refetch();
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setActionLoading(null);
    }
  };

  const copyInviteLink = (code: string) => {
    const url = `${window.location.origin}/auth?invite=${code}`;
    navigator.clipboard.writeText(url);
    toast.success("Invite link copied to clipboard.");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!partners?.length) {
    return (
      <div className="text-center py-12">
        <User className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-1">No provisioned partners yet</h3>
        <p className="text-sm text-muted-foreground">
          Partners provisioned through the Quick Provision tool will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {partners.length} provisioned partner{partners.length !== 1 ? "s" : ""}
        </p>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {partners.map((partner) => {
        const name = partner.profile?.full_name || "Unknown";
        const email = partner.profile?.email || "—";
        const hasLoggedIn = !!partner.first_login_at;
        const userId = partner.provisioned_user_id;

        return (
          <div
            key={partner.id}
            className="border rounded-lg p-4 bg-card/50 hover:bg-card/80 transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-foreground truncate">{name}</span>
                  <Badge variant={hasLoggedIn ? "default" : "secondary"} className="shrink-0 text-xs">
                    {hasLoggedIn ? "Active" : "Awaiting Login"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">{email}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                  {partner.company && (
                    <span>{partner.company.name}</span>
                  )}
                  <span>
                    Method: <span className="capitalize">{partner.provision_method?.replace("_", " ")}</span>
                  </span>
                  {partner.created_at && (
                    <span>
                      {formatDistanceToNow(new Date(partner.created_at), { addSuffix: true })}
                    </span>
                  )}
                  {partner.welcome_email_sent && (
                    <Badge variant="outline" className="text-xs">Welcome sent</Badge>
                  )}
                </div>
              </div>

              {/* Actions */}
              {userId && (
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() =>
                      setPasswordDialog({
                        open: true,
                        userId,
                        name,
                        email,
                      })
                    }
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    Set Password
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    disabled={actionLoading === `${userId}-regenerate_magic_link`}
                    onClick={() => handleAction(userId, "regenerate_magic_link")}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Magic Link
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    disabled={actionLoading === `${userId}-resend_welcome`}
                    onClick={() => handleAction(userId, "resend_welcome")}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Resend Welcome
                  </Button>

                  {partner.invite_code_generated && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => copyInviteLink(partner.invite_code_generated!)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Invite Link
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      <SetPasswordDialog
        open={passwordDialog.open}
        onOpenChange={(open) => setPasswordDialog((prev) => ({ ...prev, open }))}
        targetUserId={passwordDialog.userId}
        targetName={passwordDialog.name}
        targetEmail={passwordDialog.email}
      />
    </div>
  );
}

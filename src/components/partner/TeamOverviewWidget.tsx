import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, UserPlus, Shield, Mail, Send, AlertCircle, Check, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyDomains } from "@/hooks/useCompanyDomains";
import { toast } from "sonner";
import { motion } from "framer-motion";
import type { CompanyRole } from "@/types/company";

interface TeamOverviewWidgetProps {
  companyId: string;
}

interface TeamMember {
  id: string;
  role: string;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function TeamOverviewWidget({ companyId }: TeamOverviewWidgetProps) {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState("");
  const { domains, primaryDomain } = useCompanyDomains(companyId);

  // Invite dialog state
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<CompanyRole>("member");
  const [isInviting, setIsInviting] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [membersRes, companyRes] = await Promise.all([
        supabase
          .from("company_members")
          .select("id, role, profiles:user_id (full_name, avatar_url)")
          .eq("company_id", companyId)
          .eq("is_active", true)
          .order("joined_at", { ascending: false })
          .limit(5),
        supabase
          .from("companies")
          .select("name")
          .eq("id", companyId)
          .single(),
      ]);

      if (membersRes.data) setMembers(membersRes.data as unknown as TeamMember[]);
      if (companyRes.data) setCompanyName(companyRes.data.name);
      setLoading(false);
    };

    fetchData();
  }, [companyId]);

  const validateEmailDomain = (emailValue: string): boolean => {
    if (!emailValue.includes("@")) { setDomainError(null); return false; }
    const emailDomain = emailValue.split("@")[1]?.toLowerCase();
    if (!emailDomain) { setDomainError(null); return false; }
    if (domains.length === 0) { setDomainError(null); return true; }
    const isAllowed = domains.some(d => d.toLowerCase() === emailDomain);
    if (!isAllowed) {
      setDomainError(`Only ${domains.map(d => `@${d}`).join(", ")} emails are allowed`);
      return false;
    }
    setDomainError(null);
    return true;
  };

  const handleEmailChange = (value: string) => {
    setInviteEmail(value);
    if (value.includes("@")) validateEmailDomain(value);
    else setDomainError(null);
  };

  const handleInvite = async () => {
    if (!inviteEmail) { toast.error("Please enter an email address"); return; }
    if (domains.length > 0 && !validateEmailDomain(inviteEmail)) {
      toast.error("Please use an email from an authorized domain");
      return;
    }

    setIsInviting(true);
    try {
      const inviteCode = `TEAM-${Date.now().toString(36).toUpperCase()}`;

      const { error } = await supabase.from("invite_codes").insert({
        code: inviteCode,
        created_by: user?.id || "",
        created_by_type: "user",
        company_id: companyId,
        invite_type: "team_member",
        target_role: inviteRole,
        max_uses: 1,
        uses_count: 0,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: { email: inviteEmail },
      });

      if (error) throw error;

      const { data: inviterProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user?.id || "")
        .single();

      await supabase.functions.invoke("send-team-invite", {
        body: {
          email: inviteEmail,
          inviteCode,
          companyId,
          companyName: companyName || "Your Organization",
          inviterName: inviterProfile?.full_name,
          role: inviteRole,
        },
      });

      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      setDomainError(null);
      setShowInviteDialog(false);
    } catch (error) {
      console.error("Error sending invite:", error);
      toast.error("Failed to send invitation");
    } finally {
      setIsInviting(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner": return "default" as const;
      case "admin": return "secondary" as const;
      default: return "outline" as const;
    }
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="py-8">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const placeholder = primaryDomain ? `colleague@${primaryDomain}` : "colleague@company.com";

  return (
    <>
      <Card className="glass-card group hover:border-primary/30 transition-colors">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Your Team
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {members.length} member{members.length !== 1 ? "s" : ""}
                {domains.length > 0 && ` · @${domains[0]}`}
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowInviteDialog(true)} className="gap-1.5">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Invite</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {members.length > 0 ? (
            <div className="space-y-2">
              {members.slice(0, 4).map((member, i) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between py-1.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                      {member.profiles?.full_name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <span className="text-sm truncate">
                      {member.profiles?.full_name || "Team Member"}
                    </span>
                  </div>
                  <Badge variant={getRoleBadgeVariant(member.role)} className="text-[10px] shrink-0">
                    <Shield className="w-2.5 h-2.5 mr-0.5" />
                    {member.role}
                  </Badge>
                </motion.div>
              ))}
              {members.length > 4 && (
                <p className="text-xs text-muted-foreground pl-10">
                  +{members.length - 4} more
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No team members yet</p>
              <p className="text-xs text-muted-foreground">Invite colleagues to collaborate</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Invite Team Member
            </DialogTitle>
            <DialogDescription>
              {companyName ? `Invite a colleague to join ${companyName}` : "Send an invitation to join your organization"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Authorized domains */}
            {domains.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap p-2 bg-muted/30 rounded-lg">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Allowed:</span>
                {domains.map(domain => (
                  <Badge key={domain} variant="secondary" className="font-mono text-xs">
                    @{domain}
                  </Badge>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="home-invite-email">Email Address</Label>
              <Input
                id="home-invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder={placeholder}
                className={domainError ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {domainError && (
                <div className="flex items-center gap-1.5 text-destructive text-xs">
                  <AlertCircle className="w-3 h-3" />
                  {domainError}
                </div>
              )}
              {inviteEmail && !domainError && inviteEmail.includes("@") && (
                <div className="flex items-center gap-1.5 text-green-600 text-xs">
                  <Check className="w-3 h-3" />
                  Valid email domain
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={(v: CompanyRole) => setInviteRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="recruiter">Recruiter</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={isInviting || !inviteEmail || !!domainError}>
              {isInviting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"
                  />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

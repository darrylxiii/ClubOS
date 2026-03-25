import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldOff, Ban, Building2, Plus, Trash2, User, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useGodMode } from "@/hooks/useGodMode";
import { SetPasswordDialog } from "@/components/invites/SetPasswordDialog";

const AVAILABLE_ROLES = [
  { value: "admin", label: "Admin", description: "Full system access" },
  { value: "strategist", label: "Strategist", description: "Manage candidates and placements" },
  { value: "partner", label: "Partner", description: "Company partner with hiring pipeline" },
  { value: "user", label: "Candidate", description: "Standard user access" },
];

const COMPANY_ROLES = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "recruiter", label: "Recruiter" },
  { value: "member", label: "Member" },
];

interface UserEditDrawerProps {
  userId: string | null;
  userName: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  suspended: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  banned: "bg-destructive/15 text-destructive border-destructive/30",
};

export function UserEditDrawer({ userId, userName, open, onClose, onSaved }: UserEditDrawerProps) {
  const queryClient = useQueryClient();
  const { suspendUser, unsuspendUser } = useGodMode();
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [addingCompany, setAddingCompany] = useState(false);
  const [newCompanyId, setNewCompanyId] = useState("");
  const [newCompanyRole, setNewCompanyRole] = useState("member");

  const { data: userData } = useQuery({
    queryKey: ["user-edit-drawer", userId],
    queryFn: async () => {
      if (!userId) return null;
      const [profileRes, rolesRes, membersRes, companiesRes] = await Promise.all([
        supabase.from("profiles").select("id, email, full_name, account_status").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("company_members").select("id, company_id, role, companies(name)").eq("user_id", userId).eq("is_active", true),
        supabase.from("companies").select("id, name").order("name"),
      ]);
      return {
        profile: profileRes.data,
        roles: (rolesRes.data || []).map((r) => r.role),
        memberships: (membersRes.data || []).map((m: any) => ({
          id: m.id,
          company_id: m.company_id,
          company_name: m.companies?.name || "Unknown",
          role: m.role,
        })),
        allCompanies: companiesRes.data || [],
      };
    },
    enabled: !!userId && open,
  });

  useEffect(() => {
    if (userData?.roles) {
      setSelectedRoles(userData.roles);
    }
  }, [userData?.roles]);

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSave = async () => {
    if (!userId || saving) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      if (selectedRoles.length === 0) {
        toast.error("User must have at least one role");
        return;
      }
      await supabase.from("user_roles").delete().eq("user_id", userId);
      await supabase.from("user_roles").insert(
        selectedRoles.map((role) => ({ user_id: userId, role: role as any }))
      );
      await supabase.from("role_change_audit").insert({
        user_id: userId,
        changed_by: user.id,
        old_roles: userData?.roles || [],
        new_roles: selectedRoles,
        change_type: "bulk_update",
        metadata: { timestamp: new Date().toISOString(), admin_email: user.email },
      });
      queryClient.invalidateQueries({ queryKey: ["user-edit-drawer", userId] });
      toast.success("User updated successfully");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMembership = async (membershipId: string) => {
    try {
      await supabase.from("company_members").update({ is_active: false }).eq("id", membershipId);
      queryClient.invalidateQueries({ queryKey: ["user-edit-drawer", userId] });
      toast.success("Company membership removed");
    } catch {
      toast.error("Failed to remove membership");
    }
  };

  const handleAddMembership = async () => {
    if (!userId || !newCompanyId) return;
    setAddingCompany(true);
    try {
      const { error } = await supabase.from("company_members").insert({
        user_id: userId,
        company_id: newCompanyId,
        role: newCompanyRole,
        is_active: true,
      });
      if (error && error.code !== "23505") throw error;
      queryClient.invalidateQueries({ queryKey: ["user-edit-drawer", userId] });
      setNewCompanyId("");
      setNewCompanyRole("member");
      toast.success("Company added");
    } catch {
      toast.error("Failed to add company");
    } finally {
      setAddingCompany(false);
    }
  };

  const handleResetMFA = async () => {
    if (!userId) return;
    const confirmed = window.confirm(`Reset MFA for ${userName}? They will need to set up a new authenticator.`);
    if (!confirmed) return;
    try {
      const { error } = await supabase.functions.invoke("admin-reset-mfa", {
        body: { target_user_id: userId, reason: `MFA reset via User Management for ${userName}` },
      });
      if (error) throw error;
      toast.success(`MFA reset for ${userName}`);
    } catch {
      toast.error("Failed to reset MFA");
    }
  };

  const accountStatus = userData?.profile?.account_status || "active";
  const initials = userName?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  const availableCompanies = (userData?.allCompanies || []).filter(
    (c) => !userData?.memberships.some((m) => m.company_id === c.id)
  );

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-[480px] sm:max-w-[480px] p-0 flex flex-col gap-0">
        {/* Sticky Header */}
        <SheetHeader className="p-6 pb-4 border-b border-border/40 bg-card/50 space-y-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <span className="text-sm font-semibold text-primary">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <SheetTitle className="text-base truncate">{userName}</SheetTitle>
                <Badge variant="outline" className={`text-[10px] capitalize shrink-0 ${statusColors[accountStatus] || statusColors.active}`}>
                  {accountStatus}
                </Badge>
              </div>
              <SheetDescription className="text-xs truncate mt-0.5">
                {userData?.profile?.email || "Loading..."}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* System Roles */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm font-semibold text-foreground">System Roles</Label>
            </div>
            <div className="rounded-xl border border-border/40 bg-card/60 p-4 space-y-3">
              {AVAILABLE_ROLES.map((role) => (
                <label
                  key={role.value}
                  htmlFor={`sheet-role-${role.value}`}
                  className="flex items-start gap-3 cursor-pointer group"
                >
                  <Checkbox
                    id={`sheet-role-${role.value}`}
                    checked={selectedRoles.includes(role.value)}
                    onCheckedChange={() => toggleRole(role.value)}
                    className="mt-0.5"
                  />
                  <div className="grid gap-0.5 leading-none">
                    <span className="text-sm font-medium group-hover:text-primary transition-colors">
                      {role.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{role.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* Company Memberships */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm font-semibold text-foreground">Company Memberships</Label>
            </div>
            <div className="rounded-xl border border-border/40 bg-card/60 p-4 space-y-3">
              {userData?.memberships.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">No company memberships</p>
              ) : (
                <div className="space-y-2">
                  {userData?.memberships.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-border/30 bg-background/50 hover:bg-background/80 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">{m.company_name}</span>
                        <Badge variant="outline" className="text-[10px] capitalize shrink-0">{m.role}</Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleRemoveMembership(m.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Company Row */}
              <div className="flex gap-2 items-center pt-1 border-t border-border/20">
                <div className="flex-1 min-w-0">
                  <Select value={newCompanyId} onValueChange={setNewCompanyId}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Add company..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCompanies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24">
                  <Select value={newCompanyRole} onValueChange={setNewCompanyRole}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 shrink-0"
                  onClick={handleAddMembership}
                  disabled={!newCompanyId || addingCompany}
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </section>

          {/* Account Actions */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <ShieldOff className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm font-semibold text-foreground">Account Actions</Label>
            </div>
            <div className="rounded-xl border border-border/40 bg-card/60 p-4">
              <div className="flex flex-wrap gap-2">
                {accountStatus === "active" ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5 h-8 text-xs"
                    onClick={async () => {
                      if (userId && window.confirm(`Suspend ${userName}?`)) {
                        await suspendUser(userId, "Admin action from User Management");
                        queryClient.invalidateQueries({ queryKey: ["user-edit-drawer", userId] });
                      }
                    }}
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Suspend User
                  </Button>
                ) : accountStatus === "suspended" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 h-8 text-xs"
                    onClick={async () => {
                      if (userId) {
                        await unsuspendUser(userId);
                        queryClient.invalidateQueries({ queryKey: ["user-edit-drawer", userId] });
                      }
                    }}
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Unsuspend
                  </Button>
                ) : null}
                <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={handleResetMFA}>
                  <ShieldOff className="w-3.5 h-3.5" />
                  Reset MFA
                </Button>
              </div>
            </div>
          </section>
        </div>

        {/* Sticky Footer */}
        <div className="p-4 border-t border-border/40 bg-card/50 flex items-center gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

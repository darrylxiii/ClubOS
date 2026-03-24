import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ShieldOff, Ban, Building2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useGodMode } from "@/hooks/useGodMode";

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

export function UserEditDrawer({ userId, userName, open, onClose, onSaved }: UserEditDrawerProps) {
  const queryClient = useQueryClient();
  const { suspendUser, unsuspendUser } = useGodMode();
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [addingCompany, setAddingCompany] = useState(false);
  const [newCompanyId, setNewCompanyId] = useState("");
  const [newCompanyRole, setNewCompanyRole] = useState("member");

  // Fetch user data
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

      // Update roles
      await supabase.from("user_roles").delete().eq("user_id", userId);
      await supabase.from("user_roles").insert(
        selectedRoles.map((role) => ({
          user_id: userId,
          role: role as any,
        }))
      );

      // Audit log
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

  // Filter companies not already assigned
  const availableCompanies = (userData?.allCompanies || []).filter(
    (c) => !userData?.memberships.some((m) => m.company_id === c.id)
  );

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>Edit User — {userName}</DrawerTitle>
          <DrawerDescription>{userData?.profile?.email}</DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-6 overflow-y-auto">
          {/* System Roles */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">System Roles</Label>
            {AVAILABLE_ROLES.map((role) => (
              <div key={role.value} className="flex items-start space-x-3">
                <Checkbox
                  id={`drawer-${role.value}`}
                  checked={selectedRoles.includes(role.value)}
                  onCheckedChange={() => toggleRole(role.value)}
                />
                <div className="grid gap-1 leading-none">
                  <label htmlFor={`drawer-${role.value}`} className="text-sm font-medium cursor-pointer">
                    {role.label}
                  </label>
                  <p className="text-xs text-muted-foreground">{role.description}</p>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {/* Multi-Company Memberships */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Company Memberships</Label>
            {userData?.memberships.length === 0 ? (
              <p className="text-sm text-muted-foreground">No company memberships</p>
            ) : (
              <div className="space-y-2">
                {userData?.memberships.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{m.company_name}</span>
                      <Badge variant="outline" className="text-xs capitalize">{m.role}</Badge>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveMembership(m.id)} title="Remove">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Company */}
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Select value={newCompanyId} onValueChange={setNewCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCompanies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-32">
                <Select value={newCompanyRole} onValueChange={setNewCompanyRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button size="icon" onClick={handleAddMembership} disabled={!newCompanyId || addingCompany}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Account Lifecycle */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Account Actions</Label>
            <div className="flex flex-wrap gap-2">
              {accountStatus === "active" ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    if (userId && window.confirm(`Suspend ${userName}?`)) {
                      await suspendUser(userId, "Admin action from User Management");
                      queryClient.invalidateQueries({ queryKey: ["user-edit-drawer", userId] });
                    }
                  }}
                  className="gap-1.5"
                >
                  <Ban className="w-4 h-4" />
                  Suspend
                </Button>
              ) : accountStatus === "suspended" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (userId) {
                      await unsuspendUser(userId);
                      queryClient.invalidateQueries({ queryKey: ["user-edit-drawer", userId] });
                    }
                  }}
                  className="gap-1.5"
                >
                  <Ban className="w-4 h-4" />
                  Unsuspend
                </Button>
              ) : null}
              <Button variant="outline" size="sm" onClick={handleResetMFA} className="gap-1.5">
                <ShieldOff className="w-4 h-4" />
                Reset MFA
              </Button>
            </div>
          </div>
        </div>

        <DrawerFooter>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, UserMinus, Crown, Shield, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CompanyRole, COMPANY_ROLES } from "@/types/company";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";

interface Member {
  id: string;
  user_id: string;
  role: CompanyRole;
  is_active: boolean;
  profiles?: {
    email: string;
    full_name: string | null;
    avatar_url?: string | null;
  };
}

interface CompanyMembersManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName: string;
}

const roleIcons: Record<CompanyRole, React.ReactNode> = {
  owner: <Crown className="h-3 w-3" />,
  admin: <Shield className="h-3 w-3" />,
  recruiter: <User className="h-3 w-3" />,
  member: <User className="h-3 w-3" />,
};

const roleColors: Record<CompanyRole, string> = {
  owner: "bg-amber-500/10 text-amber-600 border-amber-600/30",
  admin: "bg-purple-500/10 text-purple-600 border-purple-600/30",
  recruiter: "bg-blue-500/10 text-blue-600 border-blue-600/30",
  member: "bg-muted text-muted-foreground",
};

export function CompanyMembersManager({
  open,
  onOpenChange,
  companyId,
  companyName,
}: CompanyMembersManagerProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [removeMember, setRemoveMember] = useState<Member | null>(null);

  useEffect(() => {
    if (open) {
      fetchMembers();
    }
  }, [open, companyId]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("company_members")
        .select(`
          id,
          user_id,
          role,
          is_active,
          profiles:user_id (
            email,
            full_name,
            avatar_url
          )
        `)
        .eq("company_id", companyId)
        .order("role");

      if (error) throw error;
      
      // Type assertion for the joined data
      setMembers((data as unknown as Member[]) || []);
    } catch (error) {
      console.error("Error fetching members:", error);
      toast.error("Failed to load company members");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: CompanyRole) => {
    try {
      const { error } = await supabase
        .from("company_members")
        .update({ role: newRole })
        .eq("id", memberId);

      if (error) throw error;

      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
      toast.success("Role updated");
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    }
  };

  const handleRemoveMember = async () => {
    if (!removeMember) return;

    try {
      const { error } = await supabase
        .from("company_members")
        .delete()
        .eq("id", removeMember.id);

      if (error) throw error;

      setMembers((prev) => prev.filter((m) => m.id !== removeMember.id));
      toast.success("Member removed");
      setRemoveMember(null);
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Members - {companyName}</DialogTitle>
            <DialogDescription>
              View and manage team members and their roles
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-96 overflow-y-auto py-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : members.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No members found
              </p>
            ) : (
              members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={member.profiles?.avatar_url || undefined} />
                      <AvatarFallback>
                        {member.profiles?.full_name?.substring(0, 2).toUpperCase() ||
                          member.profiles?.email?.substring(0, 2).toUpperCase() ||
                          "??"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {member.profiles?.full_name || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.profiles?.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={member.role}
                      onValueChange={(value) =>
                        handleRoleChange(member.id, value as CompanyRole)
                      }
                    >
                      <SelectTrigger className="w-28 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPANY_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            <div className="flex items-center gap-2">
                              {roleIcons[role]}
                              <span className="capitalize">{role}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setRemoveMember(member)}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!removeMember}
        onOpenChange={(open) => !open && setRemoveMember(null)}
        title="Remove Member?"
        description={`Are you sure you want to remove ${removeMember?.profiles?.full_name || removeMember?.profiles?.email} from ${companyName}?`}
        confirmText="Remove"
        onConfirm={handleRemoveMember}
        variant="destructive"
      />
    </>
  );
}

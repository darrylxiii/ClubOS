import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Trash2, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface CompanyMember {
  id: string;
  user_id: string;
  role: string;
  profiles: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

interface User {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

interface CompanyMembersDialogProps {
  companyId: string;
  companyName: string;
}

export function CompanyMembersDialog({ companyId, companyName }: CompanyMembersDialogProps) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("viewer");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadMembers();
      loadAvailableUsers();
    }
  }, [open, companyId]);

  const loadMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('company_members')
        .select(`
          id,
          user_id,
          role,
          profiles!company_members_user_id_fkey (full_name, email, avatar_url)
        `)
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (error) throw error;
      setMembers(data as any || []);
    } catch (error) {
      console.error('Error loading members:', error);
      toast.error("Failed to load team members");
    }
  };

  const loadAvailableUsers = async () => {
    try {
      // Get all users
      const { data: allUsers, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url');

      if (usersError) throw usersError;

      // Get current member IDs
      const { data: currentMembers } = await supabase
        .from('company_members')
        .select('user_id')
        .eq('company_id', companyId)
        .eq('is_active', true);

      const memberIds = new Set(currentMembers?.map(m => m.user_id) || []);
      const available = allUsers?.filter(u => !memberIds.has(u.id)) || [];
      
      setAvailableUsers(available);
    } catch (error) {
      console.error('Error loading available users:', error);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUser) {
      toast.error("Please select a user");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('company_members')
        .insert({
          user_id: selectedUser,
          company_id: companyId,
          role: selectedRole,
          is_active: true,
        });

      if (error) throw error;
      
      toast.success("Team member added successfully");
      setSelectedUser("");
      setSelectedRole("viewer");
      setSearchQuery("");
      loadMembers();
      loadAvailableUsers();
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error("Failed to add team member");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Remove this team member?")) return;

    try {
      const { error } = await supabase
        .from('company_members')
        .update({ is_active: false })
        .eq('id', memberId);

      if (error) throw error;
      
      toast.success("Team member removed");
      loadMembers();
      loadAvailableUsers();
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error("Failed to remove team member");
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('company_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;
      
      toast.success("Role updated");
      loadMembers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error("Failed to update role");
    }
  };

  const filteredUsers = availableUsers.filter(user =>
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-gradient-to-r from-yellow-500 to-yellow-600';
      case 'admin':
        return 'bg-primary';
      case 'recruiter':
        return 'bg-accent';
      case 'viewer':
        return 'bg-muted';
      default:
        return 'bg-muted';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Users className="w-4 h-4" />
          Manage Team ({members.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team Members - {companyName}
          </DialogTitle>
          <DialogDescription>
            Manage who has access to this company's jobs and applications
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto flex-1 pr-2">
          {/* Add Member Section */}
          <div className="border rounded-lg p-4 space-y-4 bg-card/50">
            <h4 className="font-semibold flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Add Team Member
            </h4>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Select User</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose user..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {filteredUsers.length === 0 ? (
                      <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                        {searchQuery ? "No users found" : "No available users"}
                      </div>
                    ) : (
                      filteredUsers.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <span>{user.full_name || user.email}</span>
                            <span className="text-xs text-muted-foreground">({user.email})</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="recruiter">Recruiter</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleAddMember} 
              disabled={!selectedUser || loading}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Member
            </Button>
          </div>

          {/* Current Members */}
          <div className="space-y-3">
            <h4 className="font-semibold">Current Team ({members.length})</h4>
            
            {members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                No team members yet
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-card hover:border-primary transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={member.profiles?.avatar_url || undefined} />
                        <AvatarFallback>
                          {member.profiles?.full_name?.substring(0, 2).toUpperCase() || "??"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.profiles?.full_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{member.profiles?.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Select
                        value={member.role}
                        onValueChange={(value) => handleUpdateRole(member.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">Owner</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="recruiter">Recruiter</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>

                      <Badge className={getRoleBadgeColor(member.role)}>
                        {member.role}
                      </Badge>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

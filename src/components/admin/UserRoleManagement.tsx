import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Pencil, Trash2, Ban, RotateCcw, Search, Download, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

interface UserWithRoles {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  email_verified: boolean;
  roles: string[];
}

const AVAILABLE_ROLES = [
  { value: 'admin', label: 'Admin', description: 'Full system access' },
  { value: 'strategist', label: 'Talent Strategist', description: 'Manage candidates and placements' },
  { value: 'partner', label: 'Partner', description: 'Company partner with full hiring pipeline control' },
  { value: 'user', label: 'Candidate', description: 'Standard user access' },
];

interface Company {
  id: string;
  name: string;
}

export function UserRoleManagement() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithRoles[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRoles | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter]);

  const fetchUsers = async () => {
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at, email_verified')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Fetch all companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (companiesError) throw companiesError;
      setCompanies(companiesData || []);

      // Combine data with type safety
      const usersWithRoles: UserWithRoles[] = (profiles || []).map(profile => {
        const rawRoles = userRoles?.filter(r => r.user_id === profile.id) || [];
        // 🔒 CRITICAL: Ensure roles are always strings
        const safeRoles = rawRoles.map(r => {
          const roleValue = typeof r.role === 'string' ? r.role : String(r.role);
          return roleValue;
        }).filter(role => role && role !== 'undefined' && role !== 'null');
        
        return {
          ...profile,
          roles: safeRoles
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter(user => user.roles.includes(roleFilter));
    }

    setFilteredUsers(filtered);
  };

  const handleUpdateRoles = async () => {
    if (!editingUser) return;

    try {
      // Get current user for audit logging
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Authentication required");
        return;
      }

      const oldRoles = editingUser.roles;

      // Validate: user must have at least one role
      if (selectedRoles.length === 0) {
        toast.error("User must have at least one role", {
          description: "Please select at least one role before saving"
        });
        return;
      }

      // If partner role is selected, company must be selected
      if (selectedRoles.includes('partner') && !selectedCompany) {
        toast.error("Company required for partner role", {
          description: "Please select a company when assigning the partner role"
        });
        return;
      }

      // Delete existing roles
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', editingUser.id);

      if (deleteError) throw deleteError;

      // Insert new roles
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert(selectedRoles.map(role => ({
          user_id: editingUser.id,
          role: role as 'admin' | 'strategist' | 'partner' | 'user'
        })));

      if (insertError) {
        console.error('Error inserting roles:', insertError);
        toast.error("Failed to update roles", {
          description: insertError.message
        });
        return;
      }

      // If partner role is selected, also add to company_members
      if (selectedRoles.includes('partner') && selectedCompany) {
        // Check if already a member
        const { data: existingMember } = await supabase
          .from('company_members')
          .select('id')
          .eq('user_id', editingUser.id)
          .eq('company_id', selectedCompany)
          .maybeSingle();

        if (!existingMember) {
          const { error: memberError } = await supabase
            .from('company_members')
            .insert({
              user_id: editingUser.id,
              company_id: selectedCompany,
              role: 'admin',
              is_active: true,
            });

          if (memberError) {
            console.error('Error adding company member:', memberError);
            toast.error("Role updated but failed to add to company");
          }

          // Update profile with company_id
          await supabase
            .from('profiles')
            .update({ company_id: selectedCompany })
            .eq('id', editingUser.id);
        }
      }

      // Log role change in audit table
      await supabase.from('role_change_audit').insert({
        user_id: editingUser.id,
        changed_by: user.id,
        old_roles: oldRoles,
        new_roles: selectedRoles,
        change_type: 'bulk_update',
        metadata: {
          timestamp: new Date().toISOString(),
          admin_email: user.email
        }
      });

      toast.success("User roles updated successfully", {
        description: `Updated roles for ${editingUser.email}`
      });
      
      setDialogOpen(false);
      setEditingUser(null);
      setSelectedRoles([]);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating roles:', error);
      toast.error("Failed to update user roles", {
        description: error.message || "An unexpected error occurred"
      });
    }
  };

  const openEditDialog = (user: UserWithRoles) => {
    console.log('[UserRoleManagement] Opening edit dialog:', {
      email: user.email,
      roles: user.roles,
      rolesType: typeof user.roles,
      rolesIsArray: Array.isArray(user.roles)
    });
    
    // 🔒 Ensure roles are strings
    const safeRoles = Array.isArray(user.roles) 
      ? user.roles.filter(r => typeof r === 'string')
      : [];
    
    setEditingUser(user);
    setSelectedRoles(safeRoles);
    setSelectedCompany("");
    setDialogOpen(true);
  };

  const toggleRole = (role: string) => {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const generateInviteLink = async () => {
    try {
      const { data, error } = await supabase
        .from('invite_codes')
        .insert({
          code: Math.random().toString(36).substring(2, 10).toUpperCase(),
          created_by: (await supabase.auth.getUser()).data.user?.id,
          created_by_type: 'admin',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      const inviteUrl = `${window.location.origin}/auth?invite=${data.code}`;
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Invite link copied to clipboard!");
    } catch (error) {
      console.error('Error generating invite:', error);
      toast.error("Failed to generate invite link");
    }
  };

  const exportUsers = () => {
    const csv = [
      ['Email', 'Name', 'Roles', 'Verified', 'Created At'],
      ...filteredUsers.map(user => [
        user.email,
        user.full_name || '',
        user.roles.join(', '),
        user.email_verified ? 'Yes' : 'No',
        new Date(user.created_at).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success("User list exported");
  };

  if (loading) {
    return <div>Loading users...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>User & Role Management</CardTitle>
            <CardDescription>Manage users, roles, and permissions</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={generateInviteLink}>
              <LinkIcon className="w-4 h-4 mr-2" />
              Generate Invite
            </Button>
            <Button variant="outline" onClick={exportUsers}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {AVAILABLE_ROLES.map(role => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Users Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.full_name || 'No name'}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {!Array.isArray(user.roles) || user.roles.length === 0 ? (
                        <Badge variant="outline">No roles</Badge>
                      ) : (
                        user.roles.map((role, idx) => {
                          // 🔒 Defensive: Ensure role is string
                          const roleString = typeof role === 'string' ? role : String(role);
                          const roleLabel = AVAILABLE_ROLES.find(r => r.value === roleString)?.label || roleString;
                          return (
                            <Badge key={`${roleString}-${idx}`} variant="secondary">
                              {roleLabel}
                            </Badge>
                          );
                        })
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.email_verified ? (
                      <Badge variant="default">Verified</Badge>
                    ) : (
                      <Badge variant="outline">Unverified</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(user)}
                      aria-label={`Edit roles for ${user.email || 'user'}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Edit Roles Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingUser(null);
            setSelectedRoles([]);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Roles</DialogTitle>
              <DialogDescription>
                Update roles for {editingUser?.full_name || editingUser?.email}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {AVAILABLE_ROLES.map((role) => (
                <div key={role.value} className="flex items-start space-x-3">
                  <Checkbox
                    id={role.value}
                    checked={selectedRoles.includes(role.value)}
                    onCheckedChange={() => toggleRole(role.value)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor={role.value}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {role.label}
                    </label>
                    <p className="text-sm text-muted-foreground">
                      {role.description}
                    </p>
                  </div>
                </div>
              ))}

              {/* Company selection for partner role */}
              {selectedRoles.includes('partner') && (
                <div className="space-y-2 pt-4 border-t">
                  <Label htmlFor="company">Company Assignment *</Label>
                  <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    This user will be added as a company admin with full hiring pipeline control
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleUpdateRoles}>Update Roles</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
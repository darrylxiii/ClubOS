import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Pencil, Search, Download, Link as LinkIcon, Building2, Eye, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";
import { UserSettingsPreview } from "./UserSettingsPreview";
import { useNavigate } from "react-router-dom";

interface UserWithRoles {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  email_verified: boolean;
  company_id: string | null;
  company_name: string | null;
  company_role: string | null;
  roles: string[];
  candidate_id: string | null;
}

interface Company {
  id: string;
  name: string;
}

const AVAILABLE_ROLES = [
  { value: 'admin', label: 'Admin', description: 'Full system access' },
  { value: 'strategist', label: 'Talent Strategist', description: 'Manage candidates and placements' },
  { value: 'partner', label: 'Partner', description: 'Company partner with full hiring pipeline control' },
  { value: 'user', label: 'Candidate', description: 'Standard user access' },
];

const COMPANY_ROLES = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'recruiter', label: 'Recruiter' },
];

export function UnifiedUserManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRoles | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [selectedCompanyRole, setSelectedCompanyRole] = useState<string>("recruiter");
  
  // Phase 2: Expandable rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // Phase 3: Advanced filters
  const [salaryRange, setSalaryRange] = useState<[number, number]>([0, 500000]);
  const [workPreferenceFilter, setWorkPreferenceFilter] = useState<string>("all");
  const [documentFilter, setDocumentFilter] = useState<string>("all");
  const [privacyFilter, setPrivacyFilter] = useState<string>("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter]);

  const fetchData = async () => {
    try {
      // Fetch all profiles with company info and candidate_id
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id, 
          email, 
          full_name, 
          created_at, 
          email_verified, 
          company_id,
          candidate_profiles(id)
        `)
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
        .order('name');

      if (companiesError) throw companiesError;
      setCompanies(companiesData || []);

      // Fetch company members to get role
      const { data: members, error: membersError } = await supabase
        .from('company_members')
        .select('user_id, company_id, role')
        .eq('is_active', true);

      if (membersError) throw membersError;

      // Combine all data
      const usersWithRoles: UserWithRoles[] = (profiles || []).map((profile: any) => {
        const company = companiesData?.find(c => c.id === profile.company_id);
        const member = members?.find(m => m.user_id === profile.id);
        
        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          created_at: profile.created_at,
          email_verified: profile.email_verified,
          company_id: profile.company_id,
          company_name: company?.name || null,
          company_role: member?.role || null,
          roles: userRoles?.filter(r => r.user_id === profile.id).map(r => r.role) || [],
          candidate_id: profile.candidate_profiles?.[0]?.id || null
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Basic search
    if (searchQuery) {
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter(user => user.roles.includes(roleFilter));
    }

    setFilteredUsers(filtered);
  };

  const toggleRowExpansion = (userId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Authentication required");
        return;
      }

      if (selectedRoles.length === 0) {
        toast.error("User must have at least one role");
        return;
      }

      const targetUserId = editingUser.id;
      const oldRoles = editingUser.roles;

      // Use exactly the roles selected by admin
      const finalRoles = [...selectedRoles];

      console.log('[UnifiedUserManagement] Updating roles for user:', targetUserId, 'New roles:', finalRoles);

      // Delete existing roles for the TARGET user
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', targetUserId);

      if (deleteError) {
        console.error('[UnifiedUserManagement] Delete error:', deleteError);
        throw deleteError;
      }

      console.log('[UnifiedUserManagement] Deleted old roles, inserting new ones...');

      // Insert new roles for the TARGET user
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert(finalRoles.map(role => ({
          user_id: targetUserId,
          role: role as 'admin' | 'strategist' | 'partner' | 'user'
        })));

      if (insertError) {
        console.error('[UnifiedUserManagement] Insert error:', insertError);
        throw insertError;
      }

      console.log('[UnifiedUserManagement] Roles updated successfully');

      // Update company assignment if changed
      if (selectedCompany !== (editingUser.company_id || "none")) {
        // Update profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ company_id: selectedCompany === "none" ? null : selectedCompany })
          .eq('id', editingUser.id);

        if (profileError) throw profileError;

        // Remove old company membership
        if (editingUser.company_id) {
          await supabase
            .from('company_members')
            .update({ is_active: false })
            .eq('user_id', editingUser.id)
            .eq('company_id', editingUser.company_id);
        }

        // Add new company membership
        if (selectedCompany && selectedCompany !== "none") {
          const { error: memberError } = await supabase
            .from('company_members')
            .insert({
              user_id: editingUser.id,
              company_id: selectedCompany,
              role: selectedCompanyRole,
              is_active: true,
            });

          if (memberError && memberError.code !== '23505') {
            throw memberError;
          }
        }
      } else if (selectedCompany && selectedCompany !== "none" && selectedCompanyRole !== editingUser.company_role) {
        // Update company role if company is same but role changed
        await supabase
          .from('company_members')
          .update({ role: selectedCompanyRole })
          .eq('user_id', editingUser.id)
          .eq('company_id', selectedCompany);
      }

      // Log role change in audit table
      await supabase.from('role_change_audit').insert({
        user_id: targetUserId,
        changed_by: user.id,
        old_roles: oldRoles,
        new_roles: finalRoles, // Use finalRoles instead of selectedRoles
        change_type: 'bulk_update',
        metadata: {
          timestamp: new Date().toISOString(),
          admin_email: user.email,
          target_user_email: editingUser.email,
          company_changed: selectedCompany !== (editingUser.company_id || "none")
        }
      });

      console.log('[UnifiedUserManagement] Audit log created');

      toast.success(`Roles updated successfully for ${editingUser.full_name || editingUser.email}`);
      setDialogOpen(false);
      setEditingUser(null);
      setSelectedRoles([]);
      setSelectedCompany("none");
      
      // Refresh the user list to show updated roles
      await fetchData();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error("Failed to update user", {
        description: error.message
      });
    }
  };

  const openEditDialog = (user: UserWithRoles) => {
    setEditingUser(user);
    setSelectedRoles(user.roles);
    setSelectedCompany(user.company_id || "none");
    setSelectedCompanyRole(user.company_role || "recruiter");
    setDialogOpen(true);
  };

  const toggleRole = (role: string) => {
    setSelectedRoles(prev => {
      if (prev.includes(role)) {
        // Removing a role
        return prev.filter(r => r !== role);
      } else {
        // Adding a role - admin chooses exactly what roles to assign
        return [...prev, role];
      }
    });
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
      ['Email', 'Name', 'Roles', 'Company', 'Company Role', 'Verified', 'Created At'],
      ...filteredUsers.map(user => [
        user.email,
        user.full_name || '',
        user.roles.join(', '),
        user.company_name || '',
        user.company_role || '',
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
            <CardTitle>User, Role & Company Management</CardTitle>
            <CardDescription>Manage users, assign roles, and link to companies</CardDescription>
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
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or company..."
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

          {/* Phase 3: Advanced Filters */}
          <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span>Advanced Filters (Settings-based)</span>
                {showAdvancedFilters ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Work Preference</Label>
                  <Select value={workPreferenceFilter} onValueChange={setWorkPreferenceFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="remote">Remote</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="onsite">On-site</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Document Status</Label>
                  <Select value={documentFilter} onValueChange={setDocumentFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="uploaded">Resume Uploaded</SelectItem>
                      <SelectItem value="missing">No Resume</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Privacy Mode</Label>
                  <Select value={privacyFilter} onValueChange={setPrivacyFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="stealth">Stealth Mode ON</SelectItem>
                      <SelectItem value="public">Stealth Mode OFF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Desired Salary Range: {salaryRange[0].toLocaleString()} - {salaryRange[1].toLocaleString()}</Label>
                <Slider
                  min={0}
                  max={500000}
                  step={10000}
                  value={salaryRange}
                  onValueChange={(value) => setSalaryRange(value as [number, number])}
                  className="w-full"
                />
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  setSalaryRange([0, 500000]);
                  setWorkPreferenceFilter("all");
                  setDocumentFilter("all");
                  setPrivacyFilter("all");
                }}
              >
                Reset Filters
              </Button>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Users Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Company Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <>
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {user.candidate_id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => toggleRowExpansion(user.id)}
                          >
                            {expandedRows.has(user.id) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                        {user.full_name || 'No name'}
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {user.roles.length === 0 ? (
                          <Badge variant="outline">No roles</Badge>
                        ) : (
                          user.roles.map(role => (
                            <Badge key={role} variant="secondary">
                              {AVAILABLE_ROLES.find(r => r.value === role)?.label || role}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.company_name ? (
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-muted-foreground" />
                          <span>{user.company_name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">No company</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.company_role ? (
                        <Badge variant="outline" className="capitalize">
                          {user.company_role}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
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
                      <div className="flex items-center justify-end gap-1">
                        {user.candidate_id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/candidates/${user.candidate_id}?tab=settings`)}
                            title="View Full Settings"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(user)}
                          title="Edit User"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  {/* Phase 2: Expandable Settings Preview */}
                  {user.candidate_id && expandedRows.has(user.id) && (
                    <TableRow>
                      <TableCell colSpan={8} className="bg-muted/50 p-0">
                        <div className="p-4">
                          <UserSettingsPreview 
                            userId={user.id}
                            candidateId={user.candidate_id}
                            onViewFull={() => navigate(`/candidates/${user.candidate_id}?tab=settings`)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>

        {/* Edit User Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingUser(null);
            setSelectedRoles([]);
            setSelectedCompany("none");
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage User</DialogTitle>
              <DialogDescription>
                Update roles and company assignment for {editingUser?.full_name || editingUser?.email}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Roles Section */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">System Roles</Label>
                <p className="text-sm text-muted-foreground">
                  Select exactly which roles this user should have. Each role must be explicitly chosen - no automatic assignments.
                </p>
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
              </div>

              {/* Company Assignment Section */}
              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base font-semibold">Company Assignment</Label>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Select
                    value={selectedCompany}
                    onValueChange={setSelectedCompany}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No company" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No company</SelectItem>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedCompany && selectedCompany !== "none" && (
                  <div className="space-y-2">
                    <Label htmlFor="companyRole">Company Role</Label>
                    <Select
                      value={selectedCompanyRole}
                      onValueChange={setSelectedCompanyRole}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPANY_ROLES.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleUpdateUser}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
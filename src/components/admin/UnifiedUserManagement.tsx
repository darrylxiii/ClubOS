import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Search, Download, Link as LinkIcon, Building2, Eye, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";
import { UserSettingsPreview } from "./UserSettingsPreview";
import { useNavigate } from "react-router-dom";

interface UserWithRoles {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string | null;
  email_verified: boolean | null;
  company_id: string | null;
  company_name: string | null;
  company_role: string | null;
  roles: string[];
  candidate_id: string | null;
  desired_salary_min?: number | null;
  desired_salary_max?: number | null;
  remote_work_preference?: string | boolean | null;
  resume_url?: string | null;
  stealth_mode_enabled?: boolean | null;
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
  const [saving, setSaving] = useState(false);
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
  
  // Data integrity monitoring
  const [integrityIssues, setIntegrityIssues] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter, salaryRange, workPreferenceFilter, documentFilter, privacyFilter]);

  const fetchData = async () => {
    try {
      // Fetch all profiles WITHOUT nested candidate_profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at, email_verified, company_id, remote_work_preference, stealth_mode_enabled, resume_url, desired_salary_min, desired_salary_max')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Profiles query error:', profilesError);
        throw profilesError;
      }

      // Fetch ALL candidate profiles separately (for additional candidate-specific data)
      const { data: candidateProfiles, error: candidateError } = await supabase
        .from('candidate_profiles')
        .select('user_id, id, desired_salary_min, desired_salary_max, remote_work_aspiration, resume_url');

      if (candidateError) {
        console.error('Candidate profiles query error:', candidateError);
        // Don't throw - continue without candidate data
      }

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

      // Combine all data - JOIN candidate profiles in JavaScript
      const usersWithRoles: UserWithRoles[] = (profiles || []).map((profile) => {
        const company = companiesData?.find(c => c.id === profile.company_id);
        const member = members?.find(m => m.user_id === profile.id);
        const candidateProfile = candidateProfiles?.find(cp => cp.user_id === profile.id);
        
        // 🔒 CRITICAL: Ensure roles are always strings, never objects
        const rawRoles = userRoles?.filter(r => r.user_id === profile.id) || [];
        const safeRoles = rawRoles.map(r => {
          // Type guard: ensure we extract string value from role object
          const roleValue = typeof r.role === 'string' ? r.role : String(r.role);
          return roleValue;
        }).filter(role => role && role !== 'undefined' && role !== 'null');
        
        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          created_at: profile.created_at,
          email_verified: profile.email_verified,
          company_id: profile.company_id,
          company_name: company?.name || null,
          company_role: member?.role || null,
          roles: safeRoles,
          candidate_id: candidateProfile?.id || null,
          desired_salary_min: profile.desired_salary_min || candidateProfile?.desired_salary_min || null,
          desired_salary_max: profile.desired_salary_max || candidateProfile?.desired_salary_max || null,
          remote_work_preference: profile.remote_work_preference || candidateProfile?.remote_work_aspiration || null,
          resume_url: profile.resume_url || candidateProfile?.resume_url || null,
          stealth_mode_enabled: profile.stealth_mode_enabled || null,
        };
      });

      setUsers(usersWithRoles);
      
      // Check data integrity
      const { data: mismatches } = await supabase.rpc('check_profile_auth_integrity');
      if (mismatches && mismatches.length > 0) {
        setIntegrityIssues(new Set(mismatches.map((m: { user_id: string }) => m.user_id)));
      } else {
        setIntegrityIssues(new Set());
      }
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

    // PHASE 3: Advanced Filters (only apply to users with candidate_id)
    
    // Salary Range Filter
    if (salaryRange[0] > 0 || salaryRange[1] < 500000) {
      filtered = filtered.filter(user => {
        if (!user.candidate_id) return true; // Don't filter non-candidates
        
        const min = user.desired_salary_min || 0;
        const max = user.desired_salary_max || 0;
        
        // Check if user's salary range overlaps with filter range
        return (min <= salaryRange[1] && max >= salaryRange[0]);
      });
    }

    // Work Preference Filter
    if (workPreferenceFilter !== "all") {
      filtered = filtered.filter(user => {
        if (!user.candidate_id) return true; // Don't filter non-candidates
        
        const preference = user.remote_work_preference;
        
        // Handle both boolean (from profiles) and string (from candidate_profiles)
        if (typeof preference === 'boolean') {
          return workPreferenceFilter === 'remote' ? preference === true : preference === false;
        }
        
        return preference?.toString().toLowerCase() === workPreferenceFilter.toLowerCase();
      });
    }

    // Document Filter
    if (documentFilter !== "all") {
      filtered = filtered.filter(user => {
        if (!user.candidate_id) return true; // Don't filter non-candidates
        
        if (documentFilter === "uploaded") {
          return !!user.resume_url;
        } else if (documentFilter === "missing") {
          return !user.resume_url;
        }
        return true;
      });
    }

    // Privacy Filter
    if (privacyFilter !== "all") {
      filtered = filtered.filter(user => {
        if (!user.candidate_id) return true; // Don't filter non-candidates
        
        if (privacyFilter === "stealth") {
          return user.stealth_mode_enabled === true;
        } else if (privacyFilter === "public") {
          return user.stealth_mode_enabled === false || user.stealth_mode_enabled === null;
        }
        return true;
      });
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
    if (!editingUser || saving) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[UnifiedUserManagement] No authenticated user');
        toast.error("Authentication required");
        return;
      }

      if (selectedRoles.length === 0) {
        console.error('[UnifiedUserManagement] No roles selected');
        toast.error("User must have at least one role", {
          description: "Please select at least one role before saving"
        });
        return;
      }

      const targetUserId = editingUser.id;
      const oldRoles = editingUser.roles;
      const finalRoles = [...selectedRoles];

      // Delete existing roles for the TARGET user
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', targetUserId);

      if (deleteError) throw deleteError;

      // Insert new roles for the TARGET user
      const rolesToInsert = finalRoles.map(role => ({
        user_id: targetUserId,
        role: role as 'admin' | 'strategist' | 'partner' | 'user'
      }));
      
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert(rolesToInsert)
        .select();

      if (insertError) throw insertError;

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

      

      toast.success(`Roles updated successfully for ${editingUser.full_name || editingUser.email}`);
      setDialogOpen(false);
      setEditingUser(null);
      setSelectedRoles([]);
      setSelectedCompany("none");
      
      // Refresh the user list to show updated roles
      await fetchData();
    } catch (error) {
      console.error('[UnifiedUserManagement] Error updating user:', error);
      toast.error("Failed to update user", {
        description: error instanceof Error ? error.message : "Please check the console for details"
      });
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (user: UserWithRoles) => {
    console.log('[UnifiedUserManagement] Opening edit dialog for user:', { 
      email: user.email, 
      roles: user.roles,
      rolesType: typeof user.roles,
      rolesIsArray: Array.isArray(user.roles)
    });
    
    // 🔒 CRITICAL: Ensure roles are strings before setting state
    const safeRoles = Array.isArray(user.roles) 
      ? user.roles.filter(r => typeof r === 'string') 
      : [];
    
    setEditingUser(user);
    setSelectedRoles(safeRoles);
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
                  <React.Fragment key={user.id}>
                    <TableRow>
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
                          <span>{user.full_name || 'No name'}</span>
                          {integrityIssues.has(user.id) && (
                            <Badge variant="destructive" className="text-xs">
                              Data Mismatch
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {!Array.isArray(user.roles) || user.roles.length === 0 ? (
                            <Badge variant="outline">No roles</Badge>
                          ) : (
                            user.roles.map((role, idx) => {
                              // 🔒 Defensive: Ensure role is a string
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/profile/${user.id}`)}
                            title="View Full Profile & Settings"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {user.candidate_id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/candidate/${user.candidate_id}`)}
                              title="View as Candidate"
                            >
                              <ExternalLink className="w-4 h-4" />
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
                    {user.candidate_id && expandedRows.has(user.id) && (
                      <TableRow>
                        <TableCell colSpan={8} className="bg-muted/50 p-0">
                          <div className="p-4">
                            <UserSettingsPreview 
                              userId={user.id}
                              candidateId={user.candidate_id}
                              onViewFull={() => navigate(`/candidate/${user.candidate_id}?tab=settings`)}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
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
              <Button onClick={handleUpdateUser} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
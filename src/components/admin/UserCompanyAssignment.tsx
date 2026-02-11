import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { UserPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { CompanyBasic, CompanyMember, CompanyAssignmentFormData, CompanyRole } from "@/types/company";
import { validateCompanyAssignment, COMPANY_ROLES } from "@/types/company";
import { PageLoader } from "@/components/PageLoader";

interface User {
  id: string;
  email: string;
  full_name: string | null;
}

export function UserCompanyAssignment() {
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<CompanyBasic[]>([]);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CompanyAssignmentFormData>({
    userId: "",
    companyId: "",
    role: "recruiter",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      console.log('[UserCompanyAssignment] Fetching data...');
      
      // Fetch users and companies first
      const [usersRes, companiesRes] = await Promise.all([
        supabase.from('profiles').select('id, email, full_name'),
        supabase.from('companies').select('id, name').order('name'),
      ]);

      console.log('[UserCompanyAssignment] Users response:', usersRes);
      console.log('[UserCompanyAssignment] Companies response:', companiesRes);

      if (usersRes.error) throw usersRes.error;
      if (companiesRes.error) throw companiesRes.error;

      setUsers(usersRes.data || []);
      setCompanies(companiesRes.data || []);

      // Fetch members separately - manual join
      const { data: membersData, error: membersError } = await supabase
        .from('company_members')
        .select('id, user_id, company_id, role')
        .eq('is_active', true);

      if (membersError) {
        console.error('[UserCompanyAssignment] Members error:', membersError);
      } else if (membersData) {
        // Manually join with profiles and companies
        const enrichedMembers = membersData.map(member => {
          const profile = usersRes.data?.find(u => u.id === member.user_id);
          const company = companiesRes.data?.find(c => c.id === member.company_id);
          return {
            ...member,
            profiles: profile ? { email: profile.email, full_name: profile.full_name } : undefined,
            companies: company ? { name: company.name } : undefined,
          };
        });
        setMembers(enrichedMembers as any);
        console.log('[UserCompanyAssignment] Enriched members:', enrichedMembers);
      }

    } catch (error) {
      console.error('[UserCompanyAssignment] Error fetching data:', error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form data
    const errors = validateCompanyAssignment(formData);
    if (errors.length > 0) {
      errors.forEach(err => toast.error(err.message));
      return;
    }

    try {
      const { error } = await supabase
        .from('company_members')
        .insert({
          user_id: formData.userId,
          company_id: formData.companyId,
          role: formData.role,
          is_active: true,
        });

      if (error) throw error;

      // Update user's profile with company_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ company_id: formData.companyId })
        .eq('id', formData.userId);

      if (profileError) throw profileError;

      toast.success("User assigned to company successfully");
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      console.error('Error assigning user:', error);
      const pgError = error as { code?: string };
      if (pgError.code === '23505') {
        toast.error("User is already a member of this company");
      } else {
        toast.error("Failed to assign user");
      }
    }
  };

  const handleRemove = async (memberId: string, userId: string) => {
    if (!confirm("Are you sure you want to remove this user from the company?")) return;

    try {
      const { error } = await supabase
        .from('company_members')
        .update({ is_active: false })
        .eq('id', memberId);

      if (error) throw error;

      // Clear company_id from profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ company_id: null })
        .eq('id', userId);

      if (profileError) throw profileError;

      toast.success("User removed from company");
      fetchData();
    } catch (error) {
      console.error('Error removing user:', error);
      toast.error("Failed to remove user");
    }
  };

  const resetForm = () => {
    setFormData({
      userId: "",
      companyId: "",
      role: "recruiter",
    });
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>User-Company Assignment</CardTitle>
            <CardDescription>Assign users to companies with specific roles</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Assign User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign User to Company</DialogTitle>
                <DialogDescription>
                  Select a user, company, and role
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="user">User *</Label>
                    <Select
                      required
                      value={formData.userId}
                      onValueChange={(value) => setFormData({ ...formData, userId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name || user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company *</Label>
                    <Select
                      required
                      value={formData.companyId}
                      onValueChange={(value) => setFormData({ ...formData, companyId: value })}
                    >
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
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role *</Label>
                    <Select
                      required
                      value={formData.role}
                      onValueChange={(value: string) => setFormData({ ...formData, role: value as CompanyRole })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPANY_ROLES.map(role => (
                          <SelectItem key={role} value={role}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Assign</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No user assignments yet
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    {member.profiles?.full_name || member.profiles?.email}
                  </TableCell>
                  <TableCell>{member.companies?.name}</TableCell>
                  <TableCell className="capitalize">{member.role}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(member.id, member.user_id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

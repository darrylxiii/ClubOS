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

interface User {
  id: string;
  email: string;
  full_name: string | null;
}

interface Company {
  id: string;
  name: string;
}

interface CompanyMember {
  id: string;
  user_id: string;
  company_id: string;
  role: string;
  profiles?: {
    email: string;
    full_name: string | null;
  };
  companies?: {
    name: string;
  };
}

export function UserCompanyAssignment() {
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    userId: "",
    companyId: "",
    role: "recruiter",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, companiesRes, membersRes] = await Promise.all([
        supabase.from('profiles').select('id, email, full_name'),
        supabase.from('companies').select('id, name').order('name'),
        supabase
          .from('company_members')
          .select(`
            id,
            user_id,
            company_id,
            role,
            profiles!inner(email, full_name),
            companies!inner(name)
          `)
          .eq('is_active', true)
      ]);

      if (usersRes.error) throw usersRes.error;
      if (companiesRes.error) throw companiesRes.error;
      if (membersRes.error) throw membersRes.error;

      setUsers(usersRes.data || []);
      setCompanies(companiesRes.data || []);
      setMembers(membersRes.data as any || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
    } catch (error: any) {
      console.error('Error assigning user:', error);
      if (error.code === '23505') {
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
    return <div>Loading...</div>;
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
                      onValueChange={(value) => setFormData({ ...formData, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">Owner</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="recruiter">Recruiter</SelectItem>
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

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Eye, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { UserEditDrawer } from "./UserEditDrawer";
import { formatDistanceToNow } from "date-fns";

const STAFF_ROLES = ["admin", "strategist", "recruiter", "company_admin"] as const;
type StaffRoleType = "admin" | "company_admin" | "hiring_manager" | "moderator" | "partner" | "recruiter" | "strategist" | "super_admin" | "user";

interface StaffUser {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  account_status: string | null;
  roles: string[];
  last_login_at: string | null;
}

const StaffTab = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<{ id: string; email: string; full_name: string | null } | null>(null);

  const { data: staff = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-staff-tab"],
    queryFn: async () => {
      const { data: staffRoles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", STAFF_ROLES as unknown as StaffRoleType[]);

      if (!staffRoles?.length) return [];

      const roleMap = new Map<string, string[]>();
      staffRoles.forEach((r) => {
        const list = roleMap.get(r.user_id) || [];
        list.push(r.role);
        roleMap.set(r.user_id, list);
      });

      const staffIds = [...roleMap.keys()];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name, created_at, account_status")
        .in("id", staffIds)
        .order("created_at", { ascending: false });

      // Fetch last login timestamps
      const { data: activityData } = await supabase
        .from("user_activity_tracking")
        .select("user_id, last_login_at")
        .in("user_id", staffIds);

      const loginMap = new Map(activityData?.map((a) => [a.user_id, a.last_login_at]) || []);

      return (profiles || []).map((p) => ({
        ...p,
        roles: roleMap.get(p.id) || [],
        last_login_at: loginMap.get(p.id) || null,
      })) as StaffUser[];
    },
  });

  const filtered = useMemo(() => {
    if (!search) return staff;
    const q = search.toLowerCase();
    return staff.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q) ||
        u.roles.some((r) => r.toLowerCase().includes(q))
    );
  }, [staff, search]);

  const roleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Admin",
      strategist: "Strategist",
      recruiter: "Recruiter",
      company_admin: "Company Admin",
    };
    return labels[role] || role;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Staff</CardTitle>
            <CardDescription>
              {filtered.length} staff member{filtered.length !== 1 ? "s" : ""} — admins, strategists, recruiters
            </CardDescription>
          </div>
          <Button variant="outline" onClick={() => navigate("/admin/employee-management")} className="gap-2">
            <ExternalLink className="w-4 h-4" />
            Employee Dashboard
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading staff...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No staff found</TableCell>
              </TableRow>
            ) : (
              filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name || "—"}</TableCell>
                  <TableCell className="text-sm">{user.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <Badge key={role} variant="secondary" className="text-xs">
                          {roleLabel(role)}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={(user.account_status || "active") === "active" ? "default" : "destructive"}
                      className="text-xs capitalize"
                    >
                      {user.account_status || "active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.last_login_at
                      ? formatDistanceToNow(new Date(user.last_login_at), { addSuffix: true })
                      : <span className="text-muted-foreground/60">Never</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/profile/${user.id}`)} title="View Profile">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingUser({ id: user.id, email: user.email, full_name: user.full_name })}
                        title="Edit"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <UserEditDrawer
          userId={editingUser?.id || null}
          userName={editingUser?.full_name || editingUser?.email || ""}
          open={!!editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => { setEditingUser(null); refetch(); }}
        />
      </CardContent>
    </Card>
  );
};

export default StaffTab;

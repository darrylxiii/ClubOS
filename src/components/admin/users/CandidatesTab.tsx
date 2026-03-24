import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Eye, ExternalLink, Download, Ban } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGodMode } from "@/hooks/useGodMode";
import { toast } from "sonner";
import { UserEditDrawer } from "./UserEditDrawer";
import { formatDistanceToNow } from "date-fns";

interface CandidateUser {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  account_status: string | null;
  candidate_id: string | null;
  desired_salary_min: number | null;
  desired_salary_max: number | null;
  remote_work_preference: string | boolean | null;
  resume_url: string | null;
  stealth_mode_enabled: boolean | null;
  location: string | null;
}

const CandidatesTab = () => {
  const navigate = useNavigate();
  const { suspendUser, unsuspendUser } = useGodMode();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingUser, setEditingUser] = useState<{ id: string; email: string; full_name: string | null } | null>(null);

  const { data: candidates = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-candidates-tab"],
    queryFn: async () => {
      // Fetch profiles that have 'user' role (candidates)
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "user");

      const candidateUserIds = userRoles?.map((r) => r.user_id) || [];
      if (candidateUserIds.length === 0) return [];

      // Exclude users who also have elevated roles
      const { data: elevatedRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "strategist", "partner"]);

      const elevatedIds = new Set(elevatedRoles?.map((r) => r.user_id) || []);
      const pureCandidateIds = candidateUserIds.filter((id) => !elevatedIds.has(id));

      if (pureCandidateIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name, created_at, account_status, desired_salary_min, desired_salary_max, remote_work_preference, resume_url, stealth_mode_enabled, location")
        .in("id", pureCandidateIds)
        .order("created_at", { ascending: false });

      const { data: candidateProfiles } = await supabase
        .from("candidate_profiles")
        .select("user_id, id")
        .in("user_id", pureCandidateIds);

      const cpMap = new Map(candidateProfiles?.map((cp) => [cp.user_id, cp.id]) || []);

      return (profiles || []).map((p) => ({
        ...p,
        candidate_id: cpMap.get(p.id) || null,
      })) as CandidateUser[];
    },
  });

  const filtered = useMemo(() => {
    let result = candidates;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          u.full_name?.toLowerCase().includes(q) ||
          u.location?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((u) => (u.account_status || "active") === statusFilter);
    }
    return result;
  }, [candidates, search, statusFilter]);

  const exportCandidates = () => {
    const csv = [
      ["Email", "Name", "Location", "Salary Range", "Status", "Resume", "Stealth", "Joined"],
      ...filtered.map((u) => [
        u.email,
        u.full_name || "",
        u.location || "",
        u.desired_salary_min && u.desired_salary_max
          ? `${u.desired_salary_min}-${u.desired_salary_max}`
          : "",
        u.account_status || "active",
        u.resume_url ? "Yes" : "No",
        u.stealth_mode_enabled ? "Yes" : "No",
        new Date(u.created_at).toLocaleDateString(),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `candidates-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("Candidates exported");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Candidates</CardTitle>
            <CardDescription>
              {filtered.length} candidate{filtered.length !== 1 ? "s" : ""}
            </CardDescription>
          </div>
          <Button variant="outline" onClick={exportCandidates} className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="banned">Banned</SelectItem>
              <SelectItem value="pending_review">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Salary Range</TableHead>
              <TableHead>Resume</TableHead>
              <TableHead>Stealth</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  Loading candidates...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No candidates found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name || "—"}</TableCell>
                  <TableCell className="text-sm">{user.email}</TableCell>
                  <TableCell className="text-sm">{user.location || "—"}</TableCell>
                  <TableCell className="text-sm">
                    {user.desired_salary_min && user.desired_salary_max
                      ? `€${(user.desired_salary_min / 1000).toFixed(0)}k–${(user.desired_salary_max / 1000).toFixed(0)}k`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {user.resume_url ? (
                      <Badge variant="default" className="text-xs">Uploaded</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Missing</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.stealth_mode_enabled ? (
                      <Badge variant="secondary" className="text-xs">On</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">Off</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        (user.account_status || "active") === "active"
                          ? "default"
                          : (user.account_status === "suspended" ? "destructive" : "outline")
                      }
                      className="text-xs capitalize"
                    >
                      {user.account_status || "active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/profile/${user.id}`)} title="View Profile">
                        <Eye className="w-4 h-4" />
                      </Button>
                      {user.candidate_id && (
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/candidate/${user.candidate_id}`)} title="View as Candidate">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingUser({ id: user.id, email: user.email, full_name: user.full_name })}
                        title="Edit User"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {(user.account_status || "active") === "active" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            if (window.confirm(`Suspend ${user.full_name || user.email}?`)) {
                              await suspendUser(user.id, "Admin action from User Management");
                              refetch();
                            }
                          }}
                          title="Suspend"
                        >
                          <Ban className="w-4 h-4 text-destructive" />
                        </Button>
                      ) : user.account_status === "suspended" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            await unsuspendUser(user.id);
                            refetch();
                          }}
                          title="Unsuspend"
                        >
                          <Ban className="w-4 h-4 text-emerald-500" />
                        </Button>
                      ) : null}
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
          onSaved={() => {
            setEditingUser(null);
            refetch();
          }}
        />
      </CardContent>
    </Card>
  );
};

export default CandidatesTab;

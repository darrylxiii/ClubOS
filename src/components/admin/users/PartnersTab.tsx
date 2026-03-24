import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Eye, UserPlus, Ban, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGodMode } from "@/hooks/useGodMode";
import { UserEditDrawer } from "./UserEditDrawer";
import { formatDistanceToNow } from "date-fns";
import { PartnerProvisioningModal } from "@/components/admin/PartnerProvisioningModal";

interface PartnerUser {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  account_status: string | null;
  companies: Array<{ company_id: string; company_name: string; role: string }>;
}

const PartnersTab = () => {
  const navigate = useNavigate();
  const { suspendUser, unsuspendUser } = useGodMode();
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<{ id: string; email: string; full_name: string | null } | null>(null);
  const [showProvision, setShowProvision] = useState(false);

  const { data: partners = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-partners-tab"],
    queryFn: async () => {
      const { data: partnerRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "partner");

      const partnerIds = [...new Set(partnerRoles?.map((r) => r.user_id) || [])];
      if (partnerIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name, created_at, account_status")
        .in("id", partnerIds)
        .order("created_at", { ascending: false });

      const { data: members } = await supabase
        .from("company_members")
        .select("user_id, company_id, role, companies(name)")
        .in("user_id", partnerIds)
        .eq("is_active", true);

      const memberMap = new Map<string, Array<{ company_id: string; company_name: string; role: string }>>();
      (members || []).forEach((m: any) => {
        const list = memberMap.get(m.user_id) || [];
        list.push({
          company_id: m.company_id,
          company_name: m.companies?.name || "Unknown",
          role: m.role,
        });
        memberMap.set(m.user_id, list);
      });

      return (profiles || []).map((p) => ({
        ...p,
        companies: memberMap.get(p.id) || [],
      })) as PartnerUser[];
    },
  });

  const filtered = useMemo(() => {
    if (!search) return partners;
    const q = search.toLowerCase();
    return partners.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q) ||
        u.companies.some((c) => c.company_name.toLowerCase().includes(q))
    );
  }, [partners, search]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Partners</CardTitle>
            <CardDescription>
              {filtered.length} partner{filtered.length !== 1 ? "s" : ""} across {new Set(partners.flatMap((p) => p.companies.map((c) => c.company_id))).size} companies
            </CardDescription>
          </div>
          <Button onClick={() => setShowProvision(true)} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Provision Partner
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or company..."
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
              <TableHead>Companies</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading partners...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No partners found</TableCell>
              </TableRow>
            ) : (
              filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name || "—"}</TableCell>
                  <TableCell className="text-sm">{user.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.companies.length === 0 ? (
                        <span className="text-muted-foreground text-xs">No company</span>
                      ) : (
                        user.companies.map((c) => (
                          <Badge key={c.company_id} variant="secondary" className="text-xs gap-1">
                            <Building2 className="w-3 h-3" />
                            {c.company_name}
                            <span className="text-muted-foreground capitalize">({c.role})</span>
                          </Badge>
                        ))
                      )}
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
                      {(user.account_status || "active") === "active" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            if (window.confirm(`Suspend ${user.full_name || user.email}?`)) {
                              await suspendUser(user.id, "Admin action");
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
                          onClick={async () => { await unsuspendUser(user.id); refetch(); }}
                          title="Unsuspend"
                        >
                          <Ban className="w-4 h-4 text-green-500" />
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
          onSaved={() => { setEditingUser(null); refetch(); }}
        />

        {showProvision && (
          <PartnerProvisioningModal
            open={showProvision}
            onClose={() => setShowProvision(false)}
            onSuccess={() => { setShowProvision(false); refetch(); }}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default PartnersTab;

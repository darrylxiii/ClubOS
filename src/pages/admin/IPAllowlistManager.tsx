import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useConfirmDialog } from "@/components/ui/ConfirmActionDialog";
import { Shield, Plus, Trash2, Globe, CheckCircle, XCircle, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';

interface IPRule {
  id: string;
  name: string;
  cidr_range: string;
  description: string;
  applies_to_roles: string[];
  is_active: boolean;
  created_at: string;
  created_by: string;
}

const ROLES = ["admin", "partner", "strategist", "user"];

const emptyForm = { name: "", cidr_range: "", description: "", applies_to_roles: ["admin"] as string[] };

export default function IPAllowlistManager() {
  const { t } = useTranslation('pages');
  const [rules, setRules] = useState<IPRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<IPRule | null>(null);
  const [form, setForm] = useState(emptyForm);
  const { confirm, Dialog: ConfirmDialog } = useConfirmDialog();

  useEffect(() => { fetchRules(); }, []);

  const fetchRules = async () => {
    setLoading(true);
    const { data } = await supabase.from("ip_allowlist_rules").select("*").order("created_at", { ascending: false });
    if (data) setRules(data);
    setLoading(false);
  };

  const isValidCIDR = (cidr: string) => {
    // Basic CIDR validation for IPv4
    const parts = cidr.split("/");
    if (parts.length > 2) return false;
    const ip = parts[0];
    const octets = ip.split(".");
    if (octets.length !== 4) return false;
    for (const o of octets) {
      const n = parseInt(o, 10);
      if (isNaN(n) || n < 0 || n > 255) return false;
    }
    if (parts.length === 2) {
      const mask = parseInt(parts[1], 10);
      if (isNaN(mask) || mask < 0 || mask > 32) return false;
    }
    return true;
  };

  const openCreateDialog = () => {
    setEditingRule(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (rule: IPRule) => {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      cidr_range: rule.cidr_range,
      description: rule.description || "",
      applies_to_roles: rule.applies_to_roles || ["admin"],
    });
    setDialogOpen(true);
  };

  const saveRule = async () => {
    if (!isValidCIDR(form.cidr_range)) {
      toast.error(t('toast.invalidIpOrCidrFormat', 'Invalid IP or CIDR format. Use format: 192.168.1.0/24 or 10.0.0.1'));
      return;
    }

    if (editingRule) {
      // Update existing rule
      const { error } = await supabase.from("ip_allowlist_rules").update({
        name: form.name,
        cidr_range: form.cidr_range,
        description: form.description,
        applies_to_roles: form.applies_to_roles,
      }).eq("id", editingRule.id);
      if (!error) {
        toast.success(t('toast.ipRuleUpdated', 'IP rule updated'));
        setDialogOpen(false);
        setEditingRule(null);
        setForm(emptyForm);
        fetchRules();
      } else {
        toast.error(t('toast.failedToUpdateRule', 'Failed to update rule'));
      }
    } else {
      // Create new rule
      const user = (await supabase.auth.getUser()).data.user;
      const { error } = await supabase.from("ip_allowlist_rules").insert({
        name: form.name, cidr_range: form.cidr_range, description: form.description,
        applies_to_roles: form.applies_to_roles, is_active: true, created_by: user?.id,
      });
      if (!error) {
        toast.success(t('toast.ipRuleCreated', 'IP rule created'));
        setDialogOpen(false);
        setForm(emptyForm);
        fetchRules();
      } else {
        toast.error(t('toast.failedToCreateRule', 'Failed to create rule'));
      }
    }
  };

  const toggleRule = async (id: string, isActive: boolean) => {
    await supabase.from("ip_allowlist_rules").update({ is_active: !isActive }).eq("id", id);
    toast.success(isActive ? "Rule disabled" : "Rule enabled");
    fetchRules();
  };

  const deleteRule = async (id: string) => {
    const rule = rules.find(r => r.id === id);
    confirm(
      {
        type: "delete",
        title: "Delete IP Rule",
        description: `Are you sure you want to delete the rule "${rule?.name || "this rule"}"? This action cannot be undone.`,
        confirmText: "Delete Rule",
      },
      async () => {
        await supabase.from("ip_allowlist_rules").delete().eq("id", id);
        toast.success(t('toast.ruleDeleted', 'Rule deleted'));
        fetchRules();
      }
    );
  };

  const toggleRole = (role: string) => {
    setForm(p => ({
      ...p,
      applies_to_roles: p.applies_to_roles.includes(role)
        ? p.applies_to_roles.filter(r => r !== role)
        : [...p.applies_to_roles, role],
    }));
  };

  const activeRules = rules.filter(r => r.is_active).length;

  return (
    <RoleGate allowedRoles={["admin"]}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">{t('ipAllowlist', 'IP ALLOWLIST')}</h1>
            </div>
            <p className="text-muted-foreground">{t('restrictAccessByIpAddress', 'Restrict access by IP address or CIDR range per role')}</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) { setEditingRule(null); setForm(emptyForm); }
          }}>
            <DialogTrigger asChild><Button onClick={openCreateDialog}><Plus className="h-4 w-4 mr-2" />{t('addIpRule', 'Add IP Rule')}</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingRule ? "Edit IP Allowlist Rule" : "Create IP Allowlist Rule"}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>{t('ruleName', 'Rule Name')}</Label><Input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder={t('placeholder.officeNetwork', 'Office Network')} /></div>
                <div>
                  <Label>{t("ip_address_cidr_range", "IP Address / CIDR Range")}</Label>
                  <Input value={form.cidr_range} onChange={e => setForm(p => ({...p, cidr_range: e.target.value}))} placeholder={t("1921681024_or_10001", "192.168.1.0/24 or 10.0.0.1")} />
                  <p className="text-xs text-muted-foreground mt-1">{t("single_ip_10001_or", "Single IP (10.0.0.1) or CIDR range (192.168.1.0/24)")}</p>
                </div>
                <div><Label>{t("description", "Description")}</Label><Input value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder={t('placeholder.mainOfficeIpRange', 'Main office IP range')} /></div>
                <div>
                  <Label>{t('appliesToRoles', 'Applies to Roles')}</Label>
                  <div className="flex gap-2 mt-2">
                    {ROLES.map(role => (
                      <Button key={role} size="sm" variant={form.applies_to_roles.includes(role) ? "default" : "outline"} onClick={() => toggleRole(role)}>
                        {role}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={saveRule} disabled={!form.name || !form.cidr_range}>
                  {editingRule ? "Save Changes" : "Create Rule"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}><CardHeader className="pb-2"><Skeleton className="h-4 w-24 mb-2" /><Skeleton className="h-8 w-12" /></CardHeader></Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardHeader className="pb-2"><CardDescription>{t('totalRules', 'Total Rules')}</CardDescription><CardTitle className="text-2xl">{rules.length}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>{t('activeRules', 'Active Rules')}</CardDescription><CardTitle className="text-2xl text-green-600">{activeRules}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>{t('disabledRules', 'Disabled Rules')}</CardDescription><CardTitle className="text-2xl">{rules.length - activeRules}</CardTitle></CardHeader></Card>
          </div>
        )}

        <Card>
          <CardHeader><CardTitle>{t('ipRules', 'IP Rules')}</CardTitle><CardDescription>{t('manageAllowedIpAddressesAnd', 'Manage allowed IP addresses and CIDR ranges')}</CardDescription></CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-36" />
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            ) : rules.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">{t('noIpAllowlistRulesConfigured', 'No IP allowlist rules configured. Add rules to restrict access by IP address.')}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("name", "Name")}</TableHead>
                    <TableHead>{t("cidr_ip", "CIDR / IP")}</TableHead>
                    <TableHead>{t("description", "Description")}</TableHead>
                    <TableHead>{t("roles", "Roles")}</TableHead>
                    <TableHead>{t("status", "Status")}</TableHead>
                    <TableHead>{t("actions", "Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="font-mono text-sm">{r.cidr_range}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.description || "\u2014"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {(r.applies_to_roles || []).map(role => <Badge key={role} variant="outline" className="text-xs">{role}</Badge>)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch checked={r.is_active} onCheckedChange={() => toggleRule(r.id, r.is_active)} />
                          {r.is_active ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEditDialog(r)}><Pencil className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteRule(r.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      <ConfirmDialog />
    </RoleGate>
  );
}

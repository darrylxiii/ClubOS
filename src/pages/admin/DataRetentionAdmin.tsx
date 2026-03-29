import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useConfirmDialog } from "@/components/ui/ConfirmActionDialog";
import { Database, Plus, Trash2, Clock, AlertTriangle, Play, Calendar, Pencil } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useTranslation } from 'react-i18next';

interface RetentionPolicy {
  id: string;
  name: string;
  table_name: string;
  retention_days: number;
  action_type: string;
  is_active: boolean;
  description: string;
  created_at: string;
}

interface ScheduledDeletion {
  id: string;
  policy_id: string;
  scheduled_at: string;
  executed_at: string;
  status: string;
  records_affected: number;
  notes: string;
  created_at: string;
}

const TABLES = [
  "audit_logs", "email_tracking_events", "recruiter_activity_log", "support_ticket_responses",
  "notifications", "user_sessions", "api_request_logs", "error_logs",
];

const ACTIONS = ["delete", "anonymize", "archive"];

const emptyForm = { name: "", table_name: "", retention_days: 365, action_type: "delete", description: "" };

export default function DataRetentionAdmin() {
  const { t } = useTranslation('pages');
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [deletions, setDeletions] = useState<ScheduledDeletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<RetentionPolicy | null>(null);
  const [form, setForm] = useState(emptyForm);
  const { confirm, Dialog: ConfirmDialog } = useConfirmDialog();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [pRes, dRes] = await Promise.all([
      supabase.from("data_retention_policies").select("*").order("created_at", { ascending: false }),
      supabase.from("scheduled_data_deletions").select("*").order("scheduled_at", { ascending: false }),
    ]);
    if (pRes.data) setPolicies(pRes.data);
    if (dRes.data) setDeletions(dRes.data);
    setLoading(false);
  };

  // Lookup map: policy_id -> policy name
  const policyNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    policies.forEach(p => { map[p.id] = p.name; });
    return map;
  }, [policies]);

  const getPolicyName = (policyId: string) => policyNameMap[policyId] || policyId?.slice(0, 8) + "...";

  const openCreateDialog = () => {
    setEditingPolicy(null);
    setForm(emptyForm);
    setPolicyDialogOpen(true);
  };

  const openEditDialog = (policy: RetentionPolicy) => {
    setEditingPolicy(policy);
    setForm({
      name: policy.name,
      table_name: policy.table_name,
      retention_days: policy.retention_days,
      action_type: policy.action_type,
      description: policy.description || "",
    });
    setPolicyDialogOpen(true);
  };

  const savePolicy = async () => {
    if (editingPolicy) {
      // Update existing policy
      const { error } = await supabase.from("data_retention_policies").update({
        name: form.name,
        table_name: form.table_name,
        retention_days: form.retention_days,
        action_type: form.action_type,
        description: form.description,
      }).eq("id", editingPolicy.id);
      if (!error) {
        toast.success(t('toast.retentionPolicyUpdated', 'Retention policy updated'));
        setPolicyDialogOpen(false);
        setEditingPolicy(null);
        setForm(emptyForm);
        fetchData();
      } else {
        toast.error(t('toast.failedToUpdatePolicy', 'Failed to update policy'));
      }
    } else {
      // Create new policy
      const { error } = await supabase.from("data_retention_policies").insert({
        name: form.name, table_name: form.table_name, retention_days: form.retention_days,
        action_type: form.action_type, description: form.description, is_active: true,
      });
      if (!error) {
        toast.success(t('toast.retentionPolicyCreated', 'Retention policy created'));
        setPolicyDialogOpen(false);
        setForm(emptyForm);
        fetchData();
      } else {
        toast.error(t('toast.failedToCreatePolicy', 'Failed to create policy'));
      }
    }
  };

  const togglePolicy = async (id: string, isActive: boolean) => {
    await supabase.from("data_retention_policies").update({ is_active: !isActive }).eq("id", id);
    toast.success(isActive ? t('text.dataretentionadmin.policyDisabled', 'Policy disabled') : t('text.dataretentionadmin.policyEnabled', 'Policy enabled'));
    fetchData();
  };

  const deletePolicy = async (id: string) => {
    const policy = policies.find(p => p.id === id);
    confirm(
      {
        type: "destructive",
        title: t('text.dataretentionadmin.deleteRetentionPolicy', 'Delete Retention Policy'),
        description: `This will permanently delete the retention policy "${policy?.name || "this policy"}". Any scheduled deletions linked to this policy may also be affected. This action cannot be undone.`,
        confirmText: "Delete Policy",
      },
      async () => {
        await supabase.from("data_retention_policies").delete().eq("id", id);
        toast.success(t('toast.policyDeleted', 'Policy deleted'));
        fetchData();
      }
    );
  };

  const scheduleDeletion = async (policyId: string) => {
    const policy = policies.find(p => p.id === policyId);
    confirm(
      {
        type: "confirm",
        title: t('text.dataretentionadmin.scheduleDataDeletion', 'Schedule Data Deletion'),
        description: `This will schedule a data deletion for policy "${policy?.name || "this policy"}" to execute 24 hours from now. Records matching the retention criteria on table "${policy?.table_name}" will be ${policy?.action_type || "processed"}d. Are you sure you want to proceed?`,
        confirmText: "Schedule Deletion",
      },
      async () => {
        const { error } = await supabase.from("scheduled_data_deletions").insert({
          policy_id: policyId,
          scheduled_at: new Date(Date.now() + 24 * 3600000).toISOString(),
          status: "pending",
          records_affected: 0,
          notes: "Manually triggered",
        });
        if (!error) { toast.success(t('toast.deletionScheduledFor24Hours', 'Deletion scheduled for 24 hours from now')); fetchData(); }
        else { toast.error(t('toast.failedToScheduleDeletion', 'Failed to schedule deletion')); }
      }
    );
  };

  const activePolicies = policies.filter(p => p.is_active).length;
  const pendingDeletions = deletions.filter(d => d.status === "pending").length;
  const completedDeletions = deletions.filter(d => d.status === "completed").length;

  const SkeletonTable = ({ rows = 3, cols = 6 }: { rows?: number; cols?: number }) => (
    <div className="space-y-3">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          {[...Array(cols)].map((_, j) => (
            <Skeleton key={j} className="h-5 w-full" />
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <RoleGate allowedRoles={["admin"]}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Database className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">{t('dataRetention', 'DATA RETENTION')}</h1>
            </div>
            <p className="text-muted-foreground">{t('configureRetentionPoliciesScheduleDeletions', 'Configure retention policies, schedule deletions, and track execution')}</p>
          </div>
        </div>

        {/* Stats Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}><CardHeader className="pb-2"><Skeleton className="h-4 w-28 mb-2" /><Skeleton className="h-8 w-12" /></CardHeader></Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardHeader className="pb-2"><CardDescription>{t("policies", "Policies")}</CardDescription><CardTitle className="text-2xl">{policies.length}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>{t('activePolicies', 'Active Policies')}</CardDescription><CardTitle className="text-2xl text-green-600">{activePolicies}</CardTitle></CardHeader></Card>
            <Card className={pendingDeletions > 0 ? "border-amber-500/50" : ""}><CardHeader className="pb-2"><CardDescription>{t('pendingDeletions', 'Pending Deletions')}</CardDescription><CardTitle className="text-2xl text-amber-600">{pendingDeletions}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>{t("completed", "Completed")}</CardDescription><CardTitle className="text-2xl">{completedDeletions}</CardTitle></CardHeader></Card>
          </div>
        )}

        <Tabs defaultValue="policies">
          <TabsList>
            <TabsTrigger value="policies">{t('retentionPolicies', 'Retention Policies')}</TabsTrigger>
            <TabsTrigger value="schedule">{t('scheduledDeletions', 'Scheduled Deletions')}</TabsTrigger>
            <TabsTrigger value="history">{t('executionHistory', 'Execution History')}</TabsTrigger>
          </TabsList>

          <TabsContent value="policies" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={policyDialogOpen} onOpenChange={(open) => {
                setPolicyDialogOpen(open);
                if (!open) { setEditingPolicy(null); setForm(emptyForm); }
              }}>
                <DialogTrigger asChild><Button onClick={openCreateDialog}><Plus className="h-4 w-4 mr-2" />{t('newPolicy', 'New Policy')}</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editingPolicy ? t('text.dataretentionadmin.editRetentionPolicy', 'Edit Retention Policy') : t('text.dataretentionadmin.createRetentionPolicy', 'Create Retention Policy')}</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>{t('policyName', 'Policy Name')}</Label><Input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder={t('placeholder.auditLogCleanup', 'Audit Log Cleanup')} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{t('targetTable', 'Target Table')}</Label>
                        <Select value={form.table_name} onValueChange={v => setForm(p => ({...p, table_name: v}))}>
                          <SelectTrigger><SelectValue placeholder={t('placeholder.selectTable', 'Select table')} /></SelectTrigger>
                          <SelectContent>{TABLES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>{t("action", "Action")}</Label>
                        <Select value={form.action_type} onValueChange={v => setForm(p => ({...p, action_type: v}))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{ACTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div><Label>{t("retention_period_days", "Retention Period (days)")}</Label><Input type="number" value={form.retention_days} onChange={e => setForm(p => ({...p, retention_days: Number(e.target.value)}))} /></div>
                    <div><Label>{t("description", "Description")}</Label><Textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} rows={2} placeholder={t('placeholder.purposeAndScopeOfThis', 'Purpose and scope of this policy')} /></div>
                  </div>
                  <DialogFooter>
                    <Button onClick={savePolicy} disabled={!form.name || !form.table_name}>
                      {editingPolicy ? t('text.dataretentionadmin.saveChanges', 'Save Changes') : t('text.dataretentionadmin.createPolicy', 'Create Policy')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <Card>
              <CardContent className="pt-6">
                {loading ? (
                  <SkeletonTable rows={4} cols={6} />
                ) : policies.length === 0 ? (
                  <p className="text-muted-foreground text-center py-12">{t('noRetentionPoliciesConfiguredCreate', 'No retention policies configured. Create a policy to automate data cleanup.')}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("policy", "Policy")}</TableHead>
                        <TableHead>{t("table", "Table")}</TableHead>
                        <TableHead>{t("retention", "Retention")}</TableHead>
                        <TableHead>{t("action", "Action")}</TableHead>
                        <TableHead>{t("status", "Status")}</TableHead>
                        <TableHead>{t("actions", "Actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {policies.map(p => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div><span className="font-medium">{p.name}</span>{p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}</div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{p.table_name}</TableCell>
                          <TableCell>{p.retention_days} days</TableCell>
                          <TableCell><Badge variant={p.action_type === "delete" ? "destructive" : "secondary"}>{p.action_type}</Badge></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch checked={p.is_active} onCheckedChange={() => togglePolicy(p.id, p.is_active)} />
                              <span className="text-sm">{p.is_active ? t('text.dataretentionadmin.active', 'Active') : t('text.dataretentionadmin.disabled', 'Disabled')}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => openEditDialog(p)}><Pencil className="h-3 w-3" /></Button>
                              <Button size="sm" variant="outline" onClick={() => scheduleDeletion(p.id)}><Play className="h-3 w-3 mr-1" />{t("run", "Run")}</Button>
                              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deletePolicy(p.id)}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule">
            <Card>
              <CardContent className="pt-6">
                {loading ? (
                  <SkeletonTable rows={3} cols={4} />
                ) : deletions.filter(d => d.status === "pending").length === 0 ? (
                  <p className="text-muted-foreground text-center py-12">{t('noPendingDeletionsScheduled', 'No pending deletions scheduled.')}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('scheduledAt', 'Scheduled At')}</TableHead>
                        <TableHead>{t("policy", "Policy")}</TableHead>
                        <TableHead>{t("status", "Status")}</TableHead>
                        <TableHead>{t("notes", "Notes")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deletions.filter(d => d.status === "pending").map(d => (
                        <TableRow key={d.id}>
                          <TableCell>{format(new Date(d.scheduled_at), "PPpp")}</TableCell>
                          <TableCell className="font-medium text-sm">{getPolicyName(d.policy_id)}</TableCell>
                          <TableCell><Badge className="bg-amber-500"><Clock className="h-3 w-3 mr-1" />{d.status}</Badge></TableCell>
                          <TableCell className="text-sm">{d.notes || "\u2014"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardContent className="pt-6">
                {loading ? (
                  <SkeletonTable rows={3} cols={4} />
                ) : deletions.filter(d => d.status !== "pending").length === 0 ? (
                  <p className="text-muted-foreground text-center py-12">{t('noExecutionHistoryYet', 'No execution history yet.')}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('executedAt', 'Executed At')}</TableHead>
                        <TableHead>{t("policy", "Policy")}</TableHead>
                        <TableHead>{t('recordsAffected', 'Records Affected')}</TableHead>
                        <TableHead>{t("status", "Status")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deletions.filter(d => d.status !== "pending").map(d => (
                        <TableRow key={d.id}>
                          <TableCell>{d.executed_at ? format(new Date(d.executed_at), "PPpp") : "\u2014"}</TableCell>
                          <TableCell className="font-medium text-sm">{getPolicyName(d.policy_id)}</TableCell>
                          <TableCell>{d.records_affected || 0}</TableCell>
                          <TableCell><Badge variant={d.status === "completed" ? "default" : "destructive"}>{d.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <ConfirmDialog />
    </RoleGate>
  );
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { GitBranch, Plus, Trash2, ArrowRight, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';

interface ApprovalChain {
  id: string;
  name: string;
  description: string;
  entity_type: string;
  steps: { approver_role: string; approver_email?: string }[];
  is_active: boolean;
  created_at: string;
}

const ENTITY_TYPES = [
  { value: "offer", label: "Offer Letters" },
  { value: "job_posting", label: "Job Postings" },
  { value: "expense", label: "Expenses" },
  { value: "data_deletion", label: "Data Deletion" },
  { value: "role_change", label: "Role Changes" },
];

export default function ApprovalChainsPage() {
  const { t } = useTranslation('pages');
  const [chains, setChains] = useState<ApprovalChain[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", entity_type: "offer",
    steps: [{ approver_role: "admin", approver_email: "" }],
  });

  useEffect(() => { fetchChains(); }, []);

  const fetchChains = async () => {
    const { data } = await supabase.from("approval_chain_definitions").select("*").order("created_at", { ascending: false });
    if (data) setChains(data);
    setLoading(false);
  };

  const addStep = () => setForm(p => ({ ...p, steps: [...p.steps, { approver_role: "admin", approver_email: "" }] }));
  const removeStep = (idx: number) => setForm(p => ({ ...p, steps: p.steps.filter((_, i) => i !== idx) }));

  const saveChain = async () => {
    const { error } = await supabase.from("approval_chain_definitions").insert({
      name: form.name, description: form.description,
      entity_type: form.entity_type, steps: form.steps, is_active: true,
    });
    if (!error) {
      toast.success(t('toast.approvalChainCreated', 'Approval chain created'));
      setDialogOpen(false);
      fetchChains();
    }
  };

  return (
    <RoleGate allowedRoles={["admin"]}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <GitBranch className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">{t('approvalChains', 'APPROVAL CHAINS')}</h1>
            </div>
            <p className="text-muted-foreground">{t('configureMultilevelApprovalWorkflowsFor', 'Configure multi-level approval workflows for sensitive actions')}</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />{t('createChain', 'Create Chain')}</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t('createApprovalChain', 'Create Approval Chain')}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>{t("name", "Name")}</Label><Input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder={t('placeholder.vpApprovalForHighvalueOffers', 'VP Approval for High-Value Offers')} /></div>
                <div><Label>{t("description", "Description")}</Label><Textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} /></div>
                <div>
                  <Label>{t('appliesTo', 'Applies To')}</Label>
                  <Select value={form.entity_type} onValueChange={v => setForm(p => ({...p, entity_type: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ENTITY_TYPES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between"><Label>{t('approvalSteps', 'Approval Steps')}</Label><Button size="sm" variant="outline" onClick={addStep}><Plus className="h-3 w-3 mr-1" />{t('addStep', 'Add Step')}</Button></div>
                  {form.steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 border rounded">
                      <Badge variant="outline">{i + 1}</Badge>
                      <Select value={step.approver_role} onValueChange={v => setForm(p => ({...p, steps: p.steps.map((s, j) => j === i ? {...s, approver_role: v} : s)}))}>
                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">{t("admin", "Admin")}</SelectItem>
                          <SelectItem value="strategist">{t("strategist", "Strategist")}</SelectItem>
                          <SelectItem value="partner">{t("partner", "Partner")}</SelectItem>
                          <SelectItem value="specific">{t('specificUser', 'Specific User')}</SelectItem>
                        </SelectContent>
                      </Select>
                      {step.approver_role === "specific" && (
                        <Input placeholder={t("emailexamplecom", "email@example.com")} value={step.approver_email} onChange={e => setForm(p => ({...p, steps: p.steps.map((s, j) => j === i ? {...s, approver_email: e.target.value} : s)}))} className="flex-1" />
                      )}
                      {form.steps.length > 1 && <Button size="sm" variant="ghost" onClick={() => removeStep(i)}><Trash2 className="h-3 w-3" /></Button>}
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter><Button onClick={saveChain} disabled={!form.name}>{t('createChain1', 'Create Chain')}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("chain", "Chain")}</TableHead>
                  <TableHead>{t('appliesTo1', 'Applies To')}</TableHead>
                  <TableHead>{t("steps", "Steps")}</TableHead>
                  <TableHead>{t("status", "Status")}</TableHead>
                  <TableHead>{t("actions", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chains.map(c => (
                  <TableRow key={c.id}>
                    <TableCell><div><span className="font-medium">{c.name}</span><br /><span className="text-xs text-muted-foreground">{c.description}</span></div></TableCell>
                    <TableCell><Badge variant="outline">{ENTITY_TYPES.find(e => e.value === c.entity_type)?.label || c.entity_type}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {(c.steps || []).map((s: any, i: number) => (
                          <span key={i} className="flex items-center gap-1">
                            <Badge variant="secondary" className="text-xs">{s.approver_role}</Badge>
                            {i < (c.steps || []).length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell><Button size="sm" variant="ghost" className="text-destructive" onClick={async () => { await supabase.from("approval_chain_definitions").delete().eq("id", c.id); fetchChains(); }}><Trash2 className="h-3 w-3" /></Button></TableCell>
                  </TableRow>
                ))}
                {chains.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t('noApprovalChainsConfigured', 'No approval chains configured')}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  );
}

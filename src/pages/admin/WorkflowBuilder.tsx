import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Workflow, Plus, Pencil, Trash2, Play, Pause, ArrowRight, Zap, Clock, Mail, Bell, User } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';

interface RecruitingWorkflow {
  id: string;
  name: string;
  description: string;
  entity_type: string;
  trigger_type: string;
  trigger_config: any;
  conditions: any[];
  actions: { type: string; config: any }[];
  is_active: boolean;
  execution_count: number;
  last_executed_at: string | null;
  created_at: string;
}

const TRIGGER_TYPES = [
  { value: "stage_change", label: "Stage Change", icon: ArrowRight, description: t('toast.whenApplicationMovesToA', 'When application moves to a stage') },
  { value: "field_change", label: "Field Change", icon: Pencil, description: t('toast.whenAFieldValueChanges', 'When a field value changes') },
  { value: "time_based", label: "Time-Based", icon: Clock, description: t('toast.afterXDaysInA', 'After X days in a stage') },
  { value: "event", label: "Event", icon: Zap, description: t('toast.whenAPlatformEventFires', 'When a platform event fires') },
];

const ACTION_TYPES = [
  { value: "send_email", label: "Send Email", icon: Mail },
  { value: "send_notification", label: "Send Notification", icon: Bell },
  { value: "assign_interviewer", label: "Assign Interviewer", icon: User },
  { value: "create_scorecard", label: "Create Scorecard", icon: Pencil },
  { value: "move_stage", label: "Move Stage", icon: ArrowRight },
  { value: "set_sla_timer", label: "Set SLA Timer", icon: Clock },
  { value: "trigger_webhook", label: "Trigger Webhook", icon: Zap },
];

export default function WorkflowBuilder() {
  const { t } = useTranslation('pages');
  const [workflows, setWorkflows] = useState<RecruitingWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", entity_type: "application", trigger_type: "stage_change",
    trigger_stage: "", actions: [{ type: "send_email", config: {} }],
  });

  useEffect(() => { fetchWorkflows(); }, []);

  const fetchWorkflows = async () => {
    const { data } = await supabase.from("recruiting_workflows").select("*").order("created_at", { ascending: false });
    if (data) setWorkflows(data);
    setLoading(false);
  };

  const addAction = () => {
    setForm(p => ({ ...p, actions: [...p.actions, { type: "send_notification", config: {} }] }));
  };

  const updateAction = (idx: number, type: string) => {
    setForm(p => ({ ...p, actions: p.actions.map((a, i) => i === idx ? { ...a, type } : a) }));
  };

  const removeAction = (idx: number) => {
    setForm(p => ({ ...p, actions: p.actions.filter((_, i) => i !== idx) }));
  };

  const saveWorkflow = async () => {
    const { error } = await supabase.from("recruiting_workflows").insert({
      name: form.name,
      description: form.description,
      entity_type: form.entity_type,
      trigger_type: form.trigger_type,
      trigger_config: { stage: form.trigger_stage },
      conditions: [],
      actions: form.actions,
      is_active: true,
    });
    if (!error) {
      toast.success(t('toast.workflowCreated', 'Workflow created'));
      setDialogOpen(false);
      fetchWorkflows();
    }
  };

  const toggleWorkflow = async (id: string, active: boolean) => {
    await supabase.from("recruiting_workflows").update({ is_active: active }).eq("id", id);
    toast.success(active ? "Workflow activated" : "Workflow paused");
    fetchWorkflows();
  };

  const deleteWorkflow = async (id: string) => {
    await supabase.from("recruiting_workflows").delete().eq("id", id);
    toast.success(t('toast.workflowDeleted', 'Workflow deleted'));
    fetchWorkflows();
  };

  const active = workflows.filter(w => w.is_active).length;
  const totalExecutions = workflows.reduce((a, w) => a + (w.execution_count || 0), 0);

  return (
    <RoleGate allowedRoles={["admin"]}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Workflow className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">{t('workflowBuilder', 'WORKFLOW BUILDER')}</h1>
            </div>
            <p className="text-muted-foreground">{t('automateRecruitingPipelineActionsWith', 'Automate recruiting pipeline actions with trigger-based workflows')}</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />{t('createWorkflow', 'Create Workflow')}</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('createWorkflow1', 'Create Workflow')}</DialogTitle>
                <DialogDescription>{t('defineTriggerConditionsAndAutomated', 'Define trigger, conditions, and automated actions')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div><Label>{t('workflowName', 'Workflow Name')}</Label><Input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder={t('placeholder.autoscheduleInterviewOnShortlist', 'Auto-schedule interview on shortlist')} /></div>
                <div><Label>{t("description", "Description")}</Label><Textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} /></div>

                {/* Trigger */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" />{t('whenThisHappens', 'When this happens...')}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {TRIGGER_TYPES.map(t => (
                      <div key={t.value}
                        className={`p-3 border rounded-lg cursor-pointer ${form.trigger_type === t.value ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
                        onClick={() => setForm(p => ({...p, trigger_type: t.value}))}>
                        <div className="flex items-center gap-2">
                          <t.icon className="h-4 w-4" />
                          <span className="font-medium text-sm">{t.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                      </div>
                    ))}
                  </div>
                  {form.trigger_type === "stage_change" && (
                    <div><Label>{t('targetStage', 'Target Stage')}</Label><Input value={form.trigger_stage} onChange={e => setForm(p => ({...p, trigger_stage: e.target.value}))} placeholder={t('placeholder.interviewOfferHired', 'Interview, Offer, Hired...')} /></div>
                  )}
                </div>

                {/* Actions */}
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2"><Play className="h-4 w-4 text-green-500" />{t('doTheseActions', 'Do these actions...')}</h3>
                    <Button size="sm" variant="outline" onClick={addAction}><Plus className="h-3 w-3 mr-1" />{t('addAction', 'Add Action')}</Button>
                  </div>
                  {form.actions.map((action, i) => {
                    const ActionIcon = ACTION_TYPES.find(a => a.value === action.type)?.icon || Zap;
                    return (
                      <div key={i} className="flex items-center gap-3 p-3 border rounded">
                        <Badge variant="outline" className="shrink-0">{i + 1}</Badge>
                        <ActionIcon className="h-4 w-4 shrink-0" />
                        <Select value={action.type} onValueChange={v => updateAction(i, v)}>
                          <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                          <SelectContent>{ACTION_TYPES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                        </Select>
                        {form.actions.length > 1 && (
                          <Button size="sm" variant="ghost" onClick={() => removeAction(i)}><Trash2 className="h-3 w-3" /></Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <DialogFooter><Button onClick={saveWorkflow} disabled={!form.name}>{t('createWorkflow2', 'Create Workflow')}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardHeader className="pb-2"><CardDescription>{t('totalWorkflows', 'Total Workflows')}</CardDescription><CardTitle className="text-2xl">{workflows.length}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>{t("active", "Active")}</CardDescription><CardTitle className="text-2xl text-green-600">{active}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>{t("paused", "Paused")}</CardDescription><CardTitle className="text-2xl text-amber-600">{workflows.length - active}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>{t('totalExecutions', 'Total Executions')}</CardDescription><CardTitle className="text-2xl">{totalExecutions}</CardTitle></CardHeader></Card>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("workflow", "Workflow")}</TableHead>
                  <TableHead>{t("trigger", "Trigger")}</TableHead>
                  <TableHead>{t("actions", "Actions")}</TableHead>
                  <TableHead>{t("executions", "Executions")}</TableHead>
                  <TableHead>{t("status", "Status")}</TableHead>
                  <TableHead>{t("actions", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflows.map(w => (
                  <TableRow key={w.id}>
                    <TableCell><div><span className="font-medium">{w.name}</span><br /><span className="text-xs text-muted-foreground">{w.description}</span></div></TableCell>
                    <TableCell><Badge variant="outline">{w.trigger_type.replace('_', ' ')}</Badge></TableCell>
                    <TableCell>{(w.actions || []).length} actions</TableCell>
                    <TableCell>{w.execution_count || 0}</TableCell>
                    <TableCell>
                      <Switch checked={w.is_active} onCheckedChange={v => toggleWorkflow(w.id, v)} />
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteWorkflow(w.id)}><Trash2 className="h-3 w-3" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {workflows.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t('noWorkflowsCreatedYet', 'No workflows created yet')}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  );
}

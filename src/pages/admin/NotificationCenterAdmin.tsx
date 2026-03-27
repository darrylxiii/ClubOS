import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Plus, Trash2, Mail, MessageSquare, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';

interface NotificationRule {
  id: string;
  event_type: string;
  channel: string;
  target_roles: string[];
  template_subject: string;
  template_body: string;
  is_active: boolean;
}

const EVENT_TYPES = [
  { value: "application.submitted", label: "Application Submitted" },
  { value: "application.status_changed", label: "Application Status Changed" },
  { value: "interview.scheduled", label: "Interview Scheduled" },
  { value: "interview.completed", label: "Interview Completed" },
  { value: "offer.created", label: "Offer Created" },
  { value: "offer.accepted", label: "Offer Accepted" },
  { value: "candidate.registered", label: "Candidate Registered" },
  { value: "job.published", label: "Job Published" },
  { value: "task.assigned", label: "Task Assigned" },
  { value: "task.overdue", label: "Task Overdue" },
  { value: "approval.requested", label: "Approval Requested" },
  { value: "approval.completed", label: "Approval Completed" },
];

const CHANNELS = [
  { value: "in_app", label: "In-App", icon: Bell },
  { value: "email", label: "Email", icon: Mail },
  { value: "sms", label: "SMS", icon: Smartphone },
  { value: "push", label: "Push", icon: MessageSquare },
];

const ROLES = ["admin", "strategist", "partner", "user"];

export default function NotificationCenterAdmin() {
  const { t } = useTranslation('pages');
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    event_type: "application.submitted",
    channel: "in_app",
    target_roles: ["admin"],
    template_subject: "",
    template_body: "",
  });

  useEffect(() => { fetchRules(); }, []);

  const fetchRules = async () => {
    const { data } = await supabase.from("notification_rules").select("*").order("event_type");
    if (data) setRules(data);
    setLoading(false);
  };

  const createRule = async () => {
    const { error } = await supabase.from("notification_rules").insert({
      event_type: form.event_type,
      channel: form.channel,
      target_roles: form.target_roles,
      template_subject: form.template_subject,
      template_body: form.template_body,
      is_active: true,
    });
    if (!error) {
      toast.success(t('toast.notificationRuleCreated', 'Notification rule created'));
      setDialogOpen(false);
      setForm({ event_type: "application.submitted", channel: "in_app", target_roles: ["admin"], template_subject: "", template_body: "" });
      fetchRules();
    }
  };

  const toggleRule = async (id: string, active: boolean) => {
    await supabase.from("notification_rules").update({ is_active: active }).eq("id", id);
    fetchRules();
  };

  const deleteRule = async (id: string) => {
    await supabase.from("notification_rules").delete().eq("id", id);
    toast.success(t('toast.ruleDeleted', 'Rule deleted'));
    fetchRules();
  };

  const activeRules = rules.filter(r => r.is_active).length;
  const byChannel = CHANNELS.map(ch => ({
    ...ch,
    count: rules.filter(r => r.channel === ch.value && r.is_active).length,
  }));

  return (
    <RoleGate allowedRoles={["admin"]}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Bell className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">{t('notificationCenter', 'NOTIFICATION CENTER')}</h1>
            </div>
            <p className="text-muted-foreground">{t('configureNotificationRulesPerEvent', 'Configure notification rules per event type, channel, and target role')}</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />{t('newRule', 'New Rule')}</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t('createNotificationRule', 'Create Notification Rule')}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{t('eventType', 'Event Type')}</Label>
                  <Select value={form.event_type} onValueChange={v => setForm(p => ({...p, event_type: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{EVENT_TYPES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("channel", "Channel")}</Label>
                  <Select value={form.channel} onValueChange={v => setForm(p => ({...p, channel: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('targetRoles', 'Target Roles')}</Label>
                  <div className="flex gap-3 mt-2">
                    {ROLES.map(role => (
                      <label key={role} className="flex items-center gap-2">
                        <Switch
                          checked={form.target_roles.includes(role)}
                          onCheckedChange={checked => setForm(p => ({
                            ...p,
                            target_roles: checked ? [...p.target_roles, role] : p.target_roles.filter(r => r !== role),
                          }))}
                        />
                        <span className="text-sm capitalize">{role}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div><Label>{t('subjectTemplate', 'Subject Template')}</Label><Input value={form.template_subject} onChange={e => setForm(p => ({...p, template_subject: e.target.value}))} placeholder={t('placeholder.newEventtypeFromActor', 'New {{event_type}} from {{actor}}')} /></div>
                <div><Label>{t('bodyTemplate', 'Body Template')}</Label><Input value={form.template_body} onChange={e => setForm(p => ({...p, template_body: e.target.value}))} placeholder="{{actor}} triggered {{event_type}} on {{entity}}" /></div>
              </div>
              <DialogFooter><Button onClick={createRule} disabled={!form.template_subject}>{t('createRule', 'Create Rule')}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card><CardHeader className="pb-2"><CardDescription>{t('activeRules', 'Active Rules')}</CardDescription><CardTitle className="text-2xl text-green-600">{activeRules}</CardTitle></CardHeader></Card>
          {byChannel.map(ch => (
            <Card key={ch.value}><CardHeader className="pb-2"><CardDescription>{ch.label}</CardDescription><CardTitle className="text-2xl">{ch.count}</CardTitle></CardHeader></Card>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle>{t('notificationRules', 'Notification Rules')}</CardTitle><CardDescription>{t('rulesDetermineWhichEventsTrigger', "Rules determine which events trigger notifications and how they're delivered")}</CardDescription></CardHeader>
          <CardContent>
            {rules.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">{t('noNotificationRulesConfiguredCreate', 'No notification rules configured. Create rules to automate notifications for platform events.')}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("event", "Event")}</TableHead>
                    <TableHead>{t("channel", "Channel")}</TableHead>
                    <TableHead>{t("targets", "Targets")}</TableHead>
                    <TableHead>{t("subject", "Subject")}</TableHead>
                    <TableHead>{t("status", "Status")}</TableHead>
                    <TableHead>{t("actions", "Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map(rule => (
                    <TableRow key={rule.id}>
                      <TableCell><Badge variant="outline" className="font-mono text-xs">{rule.event_type}</Badge></TableCell>
                      <TableCell><Badge variant="secondary">{CHANNELS.find(c => c.value === rule.channel)?.label || rule.channel}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {(rule.target_roles || []).map(r => <Badge key={r} variant="outline" className="text-xs">{r}</Badge>)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{rule.template_subject}</TableCell>
                      <TableCell>
                        <Switch checked={rule.is_active} onCheckedChange={v => toggleRule(rule.id, v)} />
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteRule(rule.id)}><Trash2 className="h-3 w-3" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  );
}

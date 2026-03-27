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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { UserPlus, Plus, Trash2, CheckCircle, Clock, FileText, Laptop, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';

interface OnboardingTemplate {
  id: string;
  name: string;
  department: string;
  checklist_items: { title: string; category: string; required: boolean }[];
  is_active: boolean;
}

interface EmployeeOnboarding {
  id: string;
  employee_name: string;
  template_id: string;
  start_date: string;
  status: string;
  progress_percent: number;
  completed_items: string[];
  assigned_buddy: string;
}

const CATEGORIES = [
  { value: "documents", label: "Documents", icon: FileText },
  { value: "equipment", label: "Equipment", icon: Laptop },
  { value: "training", label: "Training", icon: GraduationCap },
  { value: "access", label: "IT Access", icon: CheckCircle },
  { value: "culture", label: "Culture & Team", icon: UserPlus },
];

export default function EmployeeOnboardingPage() {
  const { t } = useTranslation('pages');
  const [templates, setTemplates] = useState<OnboardingTemplate[]>([]);
  const [onboardings, setOnboardings] = useState<EmployeeOnboarding[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: "", department: "",
    checklist_items: [{ title: "", category: "documents", required: true }],
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [tRes, oRes] = await Promise.all([
      supabase.from("onboarding_templates").select("*").order("created_at", { ascending: false }),
      supabase.from("employee_onboardings").select("*").order("start_date", { ascending: false }),
    ]);
    if (tRes.data) setTemplates(tRes.data);
    if (oRes.data) setOnboardings(oRes.data);
    setLoading(false);
  };

  const addChecklistItem = () => setTemplateForm(p => ({
    ...p, checklist_items: [...p.checklist_items, { title: "", category: "documents", required: true }],
  }));

  const removeChecklistItem = (idx: number) => setTemplateForm(p => ({
    ...p, checklist_items: p.checklist_items.filter((_, i) => i !== idx),
  }));

  const saveTemplate = async () => {
    const items = templateForm.checklist_items.filter(i => i.title.trim());
    const { error } = await supabase.from("onboarding_templates").insert({
      name: templateForm.name, department: templateForm.department,
      checklist_items: items, is_active: true,
    });
    if (!error) {
      toast.success(t('toast.onboardingTemplateCreated', 'Onboarding template created'));
      setTemplateDialogOpen(false);
      setTemplateForm({ name: "", department: "", checklist_items: [{ title: "", category: "documents", required: true }] });
      fetchData();
    }
  };

  const active = onboardings.filter(o => o.status === "in_progress").length;
  const completed = onboardings.filter(o => o.status === "completed").length;
  const avgProgress = onboardings.length > 0
    ? Math.round(onboardings.reduce((a, o) => a + (o.progress_percent || 0), 0) / onboardings.length) : 0;

  return (
    <RoleGate allowedRoles={["admin"]}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <UserPlus className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">{t('employeeOnboarding', 'EMPLOYEE ONBOARDING')}</h1>
            </div>
            <p className="text-muted-foreground">{t("posthire_onboarding_documents_equipment", "Post-hire onboarding: documents, equipment, training, and 30/60/90 check-ins")}</p>
          </div>
          <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />{t('newTemplate', 'New Template')}</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{t('createOnboardingTemplate', 'Create Onboarding Template')}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>{t('templateName', 'Template Name')}</Label><Input value={templateForm.name} onChange={e => setTemplateForm(p => ({...p, name: e.target.value}))} placeholder={t('placeholder.engineeringNewHire', 'Engineering New Hire')} /></div>
                  <div><Label>{t("department", "Department")}</Label><Input value={templateForm.department} onChange={e => setTemplateForm(p => ({...p, department: e.target.value}))} placeholder={t('placeholder.engineering', 'Engineering')} /></div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{t('checklistItems', 'Checklist Items')}</Label>
                    <Button size="sm" variant="outline" onClick={addChecklistItem}><Plus className="h-3 w-3 mr-1" />{t('addItem', 'Add Item')}</Button>
                  </div>
                  {templateForm.checklist_items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 border rounded">
                      <Badge variant="outline" className="shrink-0">{i + 1}</Badge>
                      <Input value={item.title} onChange={e => setTemplateForm(p => ({...p, checklist_items: p.checklist_items.map((it, j) => j === i ? {...it, title: e.target.value} : it)}))} placeholder={t('placeholder.itemTitle', 'Item title')} className="flex-1" />
                      <Select value={item.category} onValueChange={v => setTemplateForm(p => ({...p, checklist_items: p.checklist_items.map((it, j) => j === i ? {...it, category: v} : it)}))}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {templateForm.checklist_items.length > 1 && (
                        <Button size="sm" variant="ghost" onClick={() => removeChecklistItem(i)}><Trash2 className="h-3 w-3" /></Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter><Button onClick={saveTemplate} disabled={!templateForm.name}>{t('createTemplate', 'Create Template')}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardHeader className="pb-2"><CardDescription>{t('activeOnboardings', 'Active Onboardings')}</CardDescription><CardTitle className="text-2xl text-blue-600">{active}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>{t("completed", "Completed")}</CardDescription><CardTitle className="text-2xl text-green-600">{completed}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>{t("templates", "Templates")}</CardDescription><CardTitle className="text-2xl">{templates.length}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>{t('avgProgress', 'Avg Progress')}</CardDescription><CardTitle className="text-2xl">{avgProgress}%</CardTitle></CardHeader><CardContent><Progress value={avgProgress} className="h-2" /></CardContent></Card>
        </div>

        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">{t('activeOnboardings1', 'Active Onboardings')}</TabsTrigger>
            <TabsTrigger value="templates">{t("templates", "Templates")}</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                {onboardings.length === 0 ? (
                  <p className="text-muted-foreground text-center py-12">{t('noOnboardingsInProgressStart', 'No onboardings in progress. Start by creating a template, then initiate onboarding when a new hire is confirmed.')}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("employee", "Employee")}</TableHead>
                        <TableHead>{t('startDate', 'Start Date')}</TableHead>
                        <TableHead>{t("progress", "Progress")}</TableHead>
                        <TableHead>{t("status", "Status")}</TableHead>
                        <TableHead>{t("buddy", "Buddy")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {onboardings.map(o => (
                        <TableRow key={o.id}>
                          <TableCell className="font-medium">{o.employee_name}</TableCell>
                          <TableCell>{new Date(o.start_date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={o.progress_percent} className="h-2 w-20" />
                              <span className="text-sm">{o.progress_percent}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={o.status === "completed" ? "default" : o.status === "in_progress" ? "secondary" : "outline"}>
                              {o.status === "in_progress" ? <><Clock className="h-3 w-3 mr-1" />{t('inProgress', 'In Progress')}</> : o.status === "completed" ? <><CheckCircle className="h-3 w-3 mr-1" />{t("complete", "Complete")}</> : o.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{o.assigned_buddy || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(t => (
                <Card key={t.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{t.name}</CardTitle>
                      <Badge variant={t.is_active ? "default" : "secondary"}>{t.is_active ? "Active" : "Inactive"}</Badge>
                    </div>
                    <CardDescription>{t.department}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {(t.checklist_items || []).slice(0, 5).map((item: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-3 w-3 text-muted-foreground" />
                          <span>{item.title}</span>
                          <Badge variant="outline" className="text-xs ml-auto">{item.category}</Badge>
                        </div>
                      ))}
                      {(t.checklist_items || []).length > 5 && (
                        <p className="text-xs text-muted-foreground">+{(t.checklist_items || []).length - 5} more items</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {templates.length === 0 && (
                <Card className="col-span-full">
                  <CardContent className="py-12 text-center text-muted-foreground">{t('noOnboardingTemplatesYetCreate', 'No onboarding templates yet. Create one to standardize your new hire process.')}</CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </RoleGate>
  );
}

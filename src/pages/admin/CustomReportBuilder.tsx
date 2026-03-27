import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileBarChart, Plus, Play, Clock, Download, Save, Trash2, Share2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useTranslation } from 'react-i18next';

interface SavedReport {
  id: string;
  name: string;
  description: string;
  entity_type: string;
  columns: string[];
  filters: any[];
  schedule_enabled: boolean;
  schedule_cron: string;
  schedule_recipients: string[];
  is_shared: boolean;
  last_run_at: string | null;
  created_at: string;
}

const ENTITY_TYPES = [
  { value: "candidates", label: "Candidates", columns: ["full_name", "email", "skills", "experience_years", "location", "salary_expectation", "status", "source", "created_at"] },
  { value: "applications", label: "Applications", columns: ["candidate_name", "job_title", "company", "status", "stage", "applied_at", "source", "match_score"] },
  { value: "jobs", label: "Jobs", columns: ["title", "company", "department", "location", "salary_range", "status", "applications_count", "posted_at", "closes_at"] },
  { value: "companies", label: "Companies", columns: ["name", "industry", "size", "location", "active_jobs", "total_applications", "partnership_status", "created_at"] },
  { value: "placements", label: "Placements", columns: ["candidate", "job", "company", "salary", "fee_amount", "fee_percentage", "placed_at", "start_date"] },
];

const SCHEDULE_OPTIONS = [
  { value: "", label: "No schedule" },
  { value: "0 8 * * 1", label: "Weekly (Monday 8am)" },
  { value: "0 8 * * *", label: "Daily (8am)" },
  { value: "0 8 1 * *", label: "Monthly (1st, 8am)" },
  { value: "0 8 1 */3 *", label: "Quarterly" },
];

export default function CustomReportBuilder() {
  const { t } = useTranslation('pages');
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", entity_type: "candidates",
    columns: [] as string[], schedule_cron: "", schedule_recipients: "",
    is_shared: false,
  });

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    const { data } = await supabase.from("saved_reports").select("*").order("created_at", { ascending: false });
    if (data) setReports(data);
    setLoading(false);
  };

  const selectedEntity = ENTITY_TYPES.find(e => e.value === form.entity_type);
  const availableColumns = selectedEntity?.columns || [];

  const toggleColumn = (col: string) => {
    setForm(prev => ({
      ...prev,
      columns: prev.columns.includes(col) ? prev.columns.filter(c => c !== col) : [...prev.columns, col],
    }));
  };

  const saveReport = async () => {
    const { error } = await supabase.from("saved_reports").insert({
      name: form.name,
      description: form.description,
      entity_type: form.entity_type,
      columns: form.columns,
      filters: [],
      schedule_cron: form.schedule_cron || null,
      schedule_enabled: !!form.schedule_cron,
      schedule_recipients: form.schedule_recipients ? form.schedule_recipients.split(",").map(s => s.trim()) : [],
      is_shared: form.is_shared,
    });
    if (!error) {
      toast.success(t('toast.reportSaved', 'Report saved'));
      setDialogOpen(false);
      setForm({ name: "", description: "", entity_type: "candidates", columns: [], schedule_cron: "", schedule_recipients: "", is_shared: false });
      fetchReports();
    }
  };

  const runReport = async (id: string) => {
    await supabase.from("report_executions").insert({ report_id: id, status: "running" });
    toast.success(t('toast.reportExecutionStarted', 'Report execution started'));
  };

  const deleteReport = async (id: string) => {
    await supabase.from("saved_reports").delete().eq("id", id);
    toast.success(t('toast.reportDeleted', 'Report deleted'));
    fetchReports();
  };

  return (
    <RoleGate allowedRoles={["admin", "strategist"]}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <FileBarChart className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">{t('reportBuilder', 'REPORT BUILDER')}</h1>
            </div>
            <p className="text-muted-foreground">{t('buildCustomReportsWithScheduling', 'Build custom reports with scheduling and automated delivery')}</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />{t('newReport', 'New Report')}</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('createCustomReport', 'Create Custom Report')}</DialogTitle>
                <DialogDescription>{t('selectDataSourceColumnsAnd', 'Select data source, columns, and configure scheduling')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div><Label>{t('reportName', 'Report Name')}</Label><Input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder={t('placeholder.q1CandidatePipelineReport', 'Q1 Candidate Pipeline Report')} /></div>
                <div><Label>{t("description", "Description")}</Label><Input value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder={t('placeholder.weeklyOverviewOfCandidateActivity', 'Weekly overview of candidate activity')} /></div>
                <div>
                  <Label>{t('dataSource', 'Data Source')}</Label>
                  <Select value={form.entity_type} onValueChange={v => setForm(p => ({...p, entity_type: v, columns: []}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ENTITY_TYPES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("columns", "Columns")}</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {availableColumns.map(col => (
                      <label key={col} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-muted/30">
                        <Checkbox checked={form.columns.includes(col)} onCheckedChange={() => toggleColumn(col)} />
                        <span className="text-sm">{col.replace(/_/g, ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>{t("schedule", "Schedule")}</Label>
                  <Select value={form.schedule_cron} onValueChange={v => setForm(p => ({...p, schedule_cron: v}))}>
                    <SelectTrigger><SelectValue placeholder={t('placeholder.noSchedule', 'No schedule')} /></SelectTrigger>
                    <SelectContent>
                      {SCHEDULE_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {form.schedule_cron && (
                  <div><Label>{t("email_recipients_commaseparated", "Email Recipients (comma-separated)")}</Label><Input value={form.schedule_recipients} onChange={e => setForm(p => ({...p, schedule_recipients: e.target.value}))} placeholder={t("alicecompanycom_bobcompanycom", "alice@company.com, bob@company.com")} /></div>
                )}
                <label className="flex items-center gap-2"><Switch checked={form.is_shared} onCheckedChange={v => setForm(p => ({...p, is_shared: v}))} /><span className="text-sm">{t('shareWithTeam', 'Share with team')}</span></label>
              </div>
              <DialogFooter><Button onClick={saveReport} disabled={!form.name || form.columns.length === 0}><Save className="h-4 w-4 mr-2" />{t('saveReport', 'Save Report')}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardHeader className="pb-2"><CardDescription>{t('totalReports', 'Total Reports')}</CardDescription><CardTitle className="text-2xl">{reports.length}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>{t("scheduled", "Scheduled")}</CardDescription><CardTitle className="text-2xl text-blue-600">{reports.filter(r => r.schedule_enabled).length}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>{t("shared", "Shared")}</CardDescription><CardTitle className="text-2xl">{reports.filter(r => r.is_shared).length}</CardTitle></CardHeader></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>{t('savedReports', 'Saved Reports')}</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name", "Name")}</TableHead>
                  <TableHead>{t('dataSource1', 'Data Source')}</TableHead>
                  <TableHead>{t("columns", "Columns")}</TableHead>
                  <TableHead>{t("schedule", "Schedule")}</TableHead>
                  <TableHead>{t('lastRun', 'Last Run')}</TableHead>
                  <TableHead>{t("actions", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div><span className="font-medium">{r.name}</span>{r.is_shared && <Badge variant="outline" className="ml-2 text-xs">{t("shared", "Shared")}</Badge>}</div>
                    </TableCell>
                    <TableCell><Badge variant="secondary">{r.entity_type}</Badge></TableCell>
                    <TableCell className="text-sm">{(r.columns || []).length} columns</TableCell>
                    <TableCell>{r.schedule_enabled ? <Badge className="text-xs"><Clock className="h-3 w-3 mr-1" />{t("scheduled", "Scheduled")}</Badge> : <span className="text-muted-foreground text-sm">{t("manual", "Manual")}</span>}</TableCell>
                    <TableCell className="text-sm">{r.last_run_at ? format(new Date(r.last_run_at), "MMM d, HH:mm") : "Never"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => runReport(r.id)}><Play className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost"><Download className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteReport(r.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {reports.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t('noSavedReportsCreateYour', 'No saved reports. Create your first custom report.')}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  );
}

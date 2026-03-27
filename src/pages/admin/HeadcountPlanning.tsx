import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirmDialog } from "@/components/ui/ConfirmActionDialog";
import { Users, Plus, Briefcase, TrendingUp, Calendar, Target, Search, Download, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { useTranslation } from 'react-i18next';

interface HeadcountPlan {
  id: string;
  name: string;
  department: string;
  quarter: string;
  year: number;
  planned_headcount: number;
  actual_headcount: number;
  budget: number;
  status: string;
  notes: string;
  created_at: string;
}

interface Requisition {
  id: string;
  title: string;
  department: string;
  headcount_plan_id: string;
  job_id: string;
  priority: string;
  status: string;
  target_start_date: string;
  budget_allocated: number;
  created_at: string;
}

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 1, currentYear, currentYear + 1];
const PLAN_STATUSES = ["draft", "submitted", "approved", "active", "closed"];
const REQ_STATUSES = ["draft", "pending_approval", "approved", "open", "filled", "cancelled"];

const EMPTY_PLAN_FORM = { name: "", department: "", quarter: "Q1", year: new Date().getFullYear(), planned_headcount: 0, actual_headcount: 0, budget: 0, status: "draft", notes: "" };
const EMPTY_REQ_FORM = { title: "", department: "", headcount_plan_id: "", priority: "medium", budget_allocated: 0, target_start_date: "" };

export default function HeadcountPlanning() {
  const [plans, setPlans] = useState<HeadcountPlan[]>([]);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [reqDialogOpen, setReqDialogOpen] = useState(false);
  const [editPlanDialogOpen, setEditPlanDialogOpen] = useState(false);
  const [editReqDialogOpen, setEditReqDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<HeadcountPlan | null>(null);
  const [editingReq, setEditingReq] = useState<Requisition | null>(null);
  const [planForm, setPlanForm] = useState({ ...EMPTY_PLAN_FORM });
  const [reqForm, setReqForm] = useState({ ...EMPTY_REQ_FORM });
  const [editPlanForm, setEditPlanForm] = useState({ ...EMPTY_PLAN_FORM });
  const [editReqForm, setEditReqForm] = useState({ ...EMPTY_REQ_FORM });
  const [searchQuery, setSearchQuery] = useState("");
  const { confirm, Dialog: ConfirmDialog } = useConfirmDialog();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
  const { t } = useTranslation('pages');
    setLoading(true);
    const [planRes, reqRes] = await Promise.all([
      supabase.from("headcount_plans").select("*").order("year", { ascending: false }),
      supabase.from("requisitions").select("*").order("created_at", { ascending: false }),
    ]);
    if (planRes.data) setPlans(planRes.data);
    if (reqRes.data) setRequisitions(reqRes.data);
    setLoading(false);
  };

  const savePlan = async () => {
    const { error } = await supabase.from("headcount_plans").insert({ ...planForm, status: "draft", actual_headcount: 0 });
    if (!error) { toast.success(t('toast.planCreated', 'Plan created')); setPlanDialogOpen(false); setPlanForm({ ...EMPTY_PLAN_FORM }); fetchData(); }
  };

  const saveReq = async () => {
    const { error } = await supabase.from("requisitions").insert({ ...reqForm, status: "draft" });
    if (!error) { toast.success(t('toast.requisitionCreated', 'Requisition created')); setReqDialogOpen(false); setReqForm({ ...EMPTY_REQ_FORM }); fetchData(); }
  };

  const openEditPlanDialog = (plan: HeadcountPlan) => {
    setEditingPlan(plan);
    setEditPlanForm({
      name: plan.name || "",
      department: plan.department || "",
      quarter: plan.quarter || "Q1",
      year: plan.year || 2026,
      planned_headcount: plan.planned_headcount || 0,
      actual_headcount: plan.actual_headcount || 0,
      budget: plan.budget || 0,
      status: plan.status || "draft",
      notes: plan.notes || "",
    });
    setEditPlanDialogOpen(true);
  };

  const updatePlan = async () => {
    if (!editingPlan) return;
    const { error } = await supabase.from("headcount_plans").update({
      name: editPlanForm.name,
      department: editPlanForm.department,
      quarter: editPlanForm.quarter,
      year: editPlanForm.year,
      planned_headcount: editPlanForm.planned_headcount,
      actual_headcount: editPlanForm.actual_headcount,
      budget: editPlanForm.budget,
      status: editPlanForm.status,
      notes: editPlanForm.notes,
    }).eq("id", editingPlan.id);
    if (!error) {
      toast.success(t('toast.planUpdated', 'Plan updated'));
      setEditPlanDialogOpen(false);
      setEditingPlan(null);
      fetchData();
    } else {
      toast.error(t('toast.failedToUpdatePlan', 'Failed to update plan'));
    }
  };

  const handleDeletePlan = (plan: HeadcountPlan) => {
    confirm(
      {
        type: "delete",
        title: "Delete Headcount Plan",
        description: `Are you sure you want to delete the plan "${plan.name}" (${plan.quarter} ${plan.year})? Any linked requisitions will be unlinked. This action cannot be undone.`,
        confirmText: "Delete Plan",
      },
      async () => {
        const { error } = await supabase.from("headcount_plans").delete().eq("id", plan.id);
        if (!error) {
          toast.success(t('toast.planDeleted', 'Plan deleted'));
          fetchData();
        } else {
          toast.error(t('toast.failedToDeletePlan', 'Failed to delete plan'));
        }
      }
    );
  };

  const openEditReqDialog = (req: Requisition) => {
    setEditingReq(req);
    setEditReqForm({
      title: req.title || "",
      department: req.department || "",
      headcount_plan_id: req.headcount_plan_id || "",
      priority: req.priority || "medium",
      budget_allocated: req.budget_allocated || 0,
      target_start_date: req.target_start_date || "",
    });
    setEditReqDialogOpen(true);
  };

  const updateReq = async () => {
    if (!editingReq) return;
    const { error } = await supabase.from("requisitions").update({
      title: editReqForm.title,
      department: editReqForm.department,
      headcount_plan_id: editReqForm.headcount_plan_id || null,
      priority: editReqForm.priority,
      budget_allocated: editReqForm.budget_allocated,
      target_start_date: editReqForm.target_start_date || null,
    }).eq("id", editingReq.id);
    if (!error) {
      toast.success(t('toast.requisitionUpdated', 'Requisition updated'));
      setEditReqDialogOpen(false);
      setEditingReq(null);
      fetchData();
    } else {
      toast.error(t('toast.failedToUpdateRequisition', 'Failed to update requisition'));
    }
  };

  const updateReqStatus = async (id: string, status: string) => {
    await supabase.from("requisitions").update({ status }).eq("id", id);
    toast.success(`Requisition ${status}`);
    fetchData();
  };

  const exportPlansCSV = () => {
    if (filteredPlans.length === 0) {
      toast.error(t('toast.noPlansToExport', 'No plans to export'));
      return;
    }
    const headers = ["Name", "Department", "Quarter", "Year", "Planned Headcount", "Actual Headcount", "Fill Rate %", "Budget (EUR)", "Status", "Notes", "Created At"];
    const rows = filteredPlans.map(p => {
      const fillRate = p.planned_headcount > 0 ? Math.round((p.actual_headcount / p.planned_headcount) * 100) : 0;
      return [
        `"${(p.name || "").replace(/"/g, '""')}"`,
        `"${(p.department || "").replace(/"/g, '""')}"`,
        p.quarter,
        p.year,
        p.planned_headcount,
        p.actual_headcount,
        fillRate,
        p.budget || 0,
        p.status || "draft",
        `"${(p.notes || "").replace(/"/g, '""')}"`,
        p.created_at ? format(new Date(p.created_at), "yyyy-MM-dd HH:mm") : "",
      ].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `headcount_plans_${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredPlans.length} plans to CSV`);
  };

  // Filter plans and requisitions by search query
  const lowerSearch = searchQuery.toLowerCase().trim();
  const filteredPlans = plans.filter(p =>
    !lowerSearch ||
    (p.name || "").toLowerCase().includes(lowerSearch) ||
    (p.department || "").toLowerCase().includes(lowerSearch) ||
    (p.quarter || "").toLowerCase().includes(lowerSearch) ||
    String(p.year).includes(lowerSearch) ||
    (p.status || "").toLowerCase().includes(lowerSearch)
  );
  const filteredReqs = requisitions.filter(r =>
    !lowerSearch ||
    (r.title || "").toLowerCase().includes(lowerSearch) ||
    (r.department || "").toLowerCase().includes(lowerSearch) ||
    (r.priority || "").toLowerCase().includes(lowerSearch) ||
    (r.status || "").toLowerCase().includes(lowerSearch)
  );

  const totalPlanned = plans.reduce((a, p) => a + (p.planned_headcount || 0), 0);
  const totalActual = plans.reduce((a, p) => a + (p.actual_headcount || 0), 0);
  const totalBudget = plans.reduce((a, p) => a + (p.budget || 0), 0);
  const openReqs = requisitions.filter(r => !["filled", "cancelled"].includes(r.status)).length;

  const renderPlanForm = (
    currentForm: typeof planForm,
    setCurrentForm: React.Dispatch<React.SetStateAction<typeof planForm>>,
    showStatusAndActual = false
  ) => (
    <div className="space-y-4">
      <div><Label>{t('planName', 'Plan Name')}</Label><Input value={currentForm.name} onChange={e => setCurrentForm(p => ({...p, name: e.target.value}))} placeholder={t('placeholder.engineeringQ22026', 'Engineering Q2 2026')} /></div>
      <div className="grid grid-cols-3 gap-4">
        <div><Label>{t("department", "Department")}</Label><Input value={currentForm.department} onChange={e => setCurrentForm(p => ({...p, department: e.target.value}))} placeholder={t('placeholder.engineering', 'Engineering')} /></div>
        <div>
          <Label>{t("quarter", "Quarter")}</Label>
          <Select value={currentForm.quarter} onValueChange={v => setCurrentForm(p => ({...p, quarter: v}))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{QUARTERS.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t("year", "Year")}</Label>
          <Select value={String(currentForm.year)} onValueChange={v => setCurrentForm(p => ({...p, year: Number(v)}))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className={`grid gap-4 ${showStatusAndActual ? "grid-cols-3" : "grid-cols-2"}`}>
        <div><Label>{t('plannedHeadcount', 'Planned Headcount')}</Label><Input type="number" value={currentForm.planned_headcount} onChange={e => setCurrentForm(p => ({...p, planned_headcount: Number(e.target.value)}))} /></div>
        {showStatusAndActual && (
          <div><Label>{t('actualHeadcount', 'Actual Headcount')}</Label><Input type="number" value={currentForm.actual_headcount} onChange={e => setCurrentForm(p => ({...p, actual_headcount: Number(e.target.value)}))} /></div>
        )}
        <div><Label>{t("budget_eur", "Budget (EUR)")}</Label><Input type="number" value={currentForm.budget} onChange={e => setCurrentForm(p => ({...p, budget: Number(e.target.value)}))} /></div>
      </div>
      {showStatusAndActual && (
        <div>
          <Label>{t("status", "Status")}</Label>
          <Select value={currentForm.status} onValueChange={v => setCurrentForm(p => ({...p, status: v}))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PLAN_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      <div><Label>{t("notes", "Notes")}</Label><Textarea value={currentForm.notes} onChange={e => setCurrentForm(p => ({...p, notes: e.target.value}))} rows={3} /></div>
    </div>
  );

  const renderReqForm = (
    currentForm: typeof reqForm,
    setCurrentForm: React.Dispatch<React.SetStateAction<typeof reqForm>>
  ) => (
    <div className="space-y-4">
      <div><Label>{t("title", "Title")}</Label><Input value={currentForm.title} onChange={e => setCurrentForm(p => ({...p, title: e.target.value}))} placeholder={t('placeholder.seniorBackendEngineer', 'Senior Backend Engineer')} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>{t("department", "Department")}</Label><Input value={currentForm.department} onChange={e => setCurrentForm(p => ({...p, department: e.target.value}))} placeholder={t('placeholder.engineering1', 'Engineering')} /></div>
        <div>
          <Label>{t("priority", "Priority")}</Label>
          <Select value={currentForm.priority} onValueChange={v => setCurrentForm(p => ({...p, priority: v}))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="critical">{t("critical", "Critical")}</SelectItem>
              <SelectItem value="high">{t("high", "High")}</SelectItem>
              <SelectItem value="medium">{t("medium", "Medium")}</SelectItem>
              <SelectItem value="low">{t("low", "Low")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>{t("budget_eur", "Budget (EUR)")}</Label><Input type="number" value={currentForm.budget_allocated} onChange={e => setCurrentForm(p => ({...p, budget_allocated: Number(e.target.value)}))} /></div>
        <div><Label>{t('targetStart', 'Target Start')}</Label><Input type="date" value={currentForm.target_start_date} onChange={e => setCurrentForm(p => ({...p, target_start_date: e.target.value}))} /></div>
      </div>
      {plans.length > 0 && (
        <div>
          <Label>{t('linkToPlan', 'Link to Plan')}</Label>
          <Select value={currentForm.headcount_plan_id} onValueChange={v => setCurrentForm(p => ({...p, headcount_plan_id: v}))}>
            <SelectTrigger><SelectValue placeholder={t('placeholder.selectPlanOptional', 'Select plan (optional)')} /></SelectTrigger>
            <SelectContent>{plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  const LoadingSkeleton = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardHeader className="pb-2"><Skeleton className="h-4 w-24 mb-2" /><Skeleton className="h-8 w-16" /></CardHeader></Card>
        ))}
      </div>
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-sm" />
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <RoleGate allowedRoles={["admin"]}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">{t('headcountPlanning', 'HEADCOUNT PLANNING')}</h1>
            </div>
            <p className="text-muted-foreground">{t('planHeadcountByDepartmentManage', 'Plan headcount by department, manage requisitions, and track budget')}</p>
          </div>
        </div>

        {loading ? <LoadingSkeleton /> : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card><CardHeader className="pb-2"><CardDescription>{t('plannedHeadcount1', 'Planned Headcount')}</CardDescription><CardTitle className="text-2xl">{totalPlanned}</CardTitle></CardHeader></Card>
              <Card><CardHeader className="pb-2"><CardDescription>{t('actualHeadcount1', 'Actual Headcount')}</CardDescription><CardTitle className="text-2xl text-green-600">{totalActual}</CardTitle></CardHeader></Card>
              <Card><CardHeader className="pb-2"><CardDescription>{t('totalBudget', 'Total Budget')}</CardDescription><CardTitle className="text-2xl">{"\u20AC"}{totalBudget.toLocaleString()}</CardTitle></CardHeader></Card>
              <Card><CardHeader className="pb-2"><CardDescription>{t('openRequisitions', 'Open Requisitions')}</CardDescription><CardTitle className="text-2xl text-amber-600">{openReqs}</CardTitle></CardHeader></Card>
            </div>

            {/* Search bar */}
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('placeholder.searchPlansAndRequisitions', 'Search plans and requisitions...')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Tabs defaultValue="plans">
              <TabsList>
                <TabsTrigger value="plans">{t('headcountPlans', 'Headcount Plans')}</TabsTrigger>
                <TabsTrigger value="reqs">{t("requisitions", "Requisitions")}</TabsTrigger>
                <TabsTrigger value="dashboard">{t("dashboard", "Dashboard")}</TabsTrigger>
              </TabsList>

              <TabsContent value="plans" className="space-y-4">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={exportPlansCSV}>
                    <Download className="h-4 w-4 mr-2" />{t('exportCsv', 'Export CSV')}</Button>
                  <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
                    <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />{t('newPlan', 'New Plan')}</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>{t('createHeadcountPlan', 'Create Headcount Plan')}</DialogTitle></DialogHeader>
                      {renderPlanForm(planForm, setPlanForm, false)}
                      <DialogFooter><Button onClick={savePlan} disabled={!planForm.name}>{t('createPlan', 'Create Plan')}</Button></DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                <Card>
                  <CardContent className="pt-6">
                    {filteredPlans.length === 0 ? (
                      <p className="text-muted-foreground text-center py-12">
                        {searchQuery ? "No plans match your search." : "No headcount plans yet. Create a plan to start workforce planning."}
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("plan", "Plan")}</TableHead>
                            <TableHead>{t("department", "Department")}</TableHead>
                            <TableHead>{t("period", "Period")}</TableHead>
                            <TableHead>{t("planned", "Planned")}</TableHead>
                            <TableHead>{t("actual", "Actual")}</TableHead>
                            <TableHead>{t('fillRate', 'Fill Rate')}</TableHead>
                            <TableHead>{t("budget", "Budget")}</TableHead>
                            <TableHead>{t("status", "Status")}</TableHead>
                            <TableHead className="text-right">{t("actions", "Actions")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredPlans.map(p => {
                            const fillRate = p.planned_headcount > 0 ? Math.round((p.actual_headcount / p.planned_headcount) * 100) : 0;
                            return (
                              <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEditPlanDialog(p)}>
                                <TableCell className="font-medium">{p.name}</TableCell>
                                <TableCell>{p.department}</TableCell>
                                <TableCell>{p.quarter} {p.year}</TableCell>
                                <TableCell>{p.planned_headcount}</TableCell>
                                <TableCell>{p.actual_headcount}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 bg-muted rounded-full h-2"><div className="bg-primary rounded-full h-2" style={{ width: `${Math.min(fillRate, 100)}%` }} /></div>
                                    <span className="text-xs">{fillRate}%</span>
                                  </div>
                                </TableCell>
                                <TableCell>{"\u20AC"}{(p.budget || 0).toLocaleString()}</TableCell>
                                <TableCell><Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status || "draft"}</Badge></TableCell>
                                <TableCell className="text-right">
                                  <div className="flex gap-1 justify-end">
                                    <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); openEditPlanDialog(p); }}>
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="text-destructive" onClick={e => { e.stopPropagation(); handleDeletePlan(p); }}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reqs" className="space-y-4">
                <div className="flex justify-end">
                  <Dialog open={reqDialogOpen} onOpenChange={setReqDialogOpen}>
                    <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />{t('newRequisition', 'New Requisition')}</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>{t('createRequisition', 'Create Requisition')}</DialogTitle></DialogHeader>
                      {renderReqForm(reqForm, setReqForm)}
                      <DialogFooter><Button onClick={saveReq} disabled={!reqForm.title}>{t("create", "Create")}</Button></DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                <Card>
                  <CardContent className="pt-6">
                    {filteredReqs.length === 0 ? (
                      <p className="text-muted-foreground text-center py-12">
                        {searchQuery ? "No requisitions match your search." : "No requisitions. Create one to start tracking open positions."}
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("title", "Title")}</TableHead>
                            <TableHead>{t("department", "Department")}</TableHead>
                            <TableHead>{t("priority", "Priority")}</TableHead>
                            <TableHead>{t("budget", "Budget")}</TableHead>
                            <TableHead>{t('targetStart1', 'Target Start')}</TableHead>
                            <TableHead>{t("status", "Status")}</TableHead>
                            <TableHead>{t("actions", "Actions")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredReqs.map(r => (
                            <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEditReqDialog(r)}>
                              <TableCell className="font-medium">{r.title}</TableCell>
                              <TableCell>{r.department}</TableCell>
                              <TableCell><Badge variant={r.priority === "critical" ? "destructive" : r.priority === "high" ? "default" : "secondary"}>{r.priority}</Badge></TableCell>
                              <TableCell>{"\u20AC"}{(r.budget_allocated || 0).toLocaleString()}</TableCell>
                              <TableCell className="text-sm">{r.target_start_date || "\u2014"}</TableCell>
                              <TableCell><Badge variant="outline">{r.status.replace("_", " ")}</Badge></TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); openEditReqDialog(r); }}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  {r.status === "draft" && <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); updateReqStatus(r.id, "pending_approval"); }}>{t("submit", "Submit")}</Button>}
                                  {r.status === "pending_approval" && <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); updateReqStatus(r.id, "approved"); }}>{t("approve", "Approve")}</Button>}
                                  {r.status === "approved" && <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); updateReqStatus(r.id, "open"); }}>{t("start", "Start")}</Button>}
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

              <TabsContent value="dashboard" className="space-y-4">
                <Card>
                  <CardHeader><CardTitle>{t('plannedVsActualByDepartment', 'Planned vs Actual by Department')}</CardTitle></CardHeader>
                  <CardContent>
                    {plans.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">{t('noDataToDisplay', 'No data to display.')}</p>
                    ) : (
                      <div className="space-y-3">
                        {[...new Set(plans.map(p => p.department).filter(Boolean))].map(dept => {
                          const deptPlans = plans.filter(p => p.department === dept);
                          const planned = deptPlans.reduce((a, p) => a + (p.planned_headcount || 0), 0);
                          const actual = deptPlans.reduce((a, p) => a + (p.actual_headcount || 0), 0);
                          const pct = planned > 0 ? Math.round((actual / planned) * 100) : 0;
                          return (
                            <div key={dept} className="flex items-center gap-3">
                              <span className="w-32 text-sm font-medium">{dept}</span>
                              <div className="flex-1 bg-muted rounded-full h-4 relative">
                                <div className="bg-primary/30 rounded-full h-4 absolute" style={{ width: "100%" }} />
                                <div className="bg-primary rounded-full h-4 relative" style={{ width: `${Math.min(pct, 100)}%` }} />
                              </div>
                              <span className="w-24 text-sm text-right">{actual}/{planned} ({pct}%)</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Edit Plan Dialog */}
        <Dialog open={editPlanDialogOpen} onOpenChange={(open) => { setEditPlanDialogOpen(open); if (!open) setEditingPlan(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Plan: {editingPlan?.name}</DialogTitle>
            </DialogHeader>
            {renderPlanForm(editPlanForm, setEditPlanForm, true)}
            <DialogFooter><Button onClick={updatePlan} disabled={!editPlanForm.name}>{t('saveChanges', 'Save Changes')}</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Requisition Dialog */}
        <Dialog open={editReqDialogOpen} onOpenChange={(open) => { setEditReqDialogOpen(open); if (!open) setEditingReq(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Requisition: {editingReq?.title}</DialogTitle>
            </DialogHeader>
            {renderReqForm(editReqForm, setEditReqForm)}
            <DialogFooter><Button onClick={updateReq} disabled={!editReqForm.title}>{t('saveChanges1', 'Save Changes')}</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <ConfirmDialog />
      </div>
    </RoleGate>
  );
}

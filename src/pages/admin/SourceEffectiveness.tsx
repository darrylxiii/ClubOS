import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGate } from "@/components/RoleGate";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useConfirmDialog } from "@/components/ui/ConfirmActionDialog";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { Crosshair, DollarSign, TrendingUp, TrendingDown, Plus, BarChart3, Target, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { useTranslation } from 'react-i18next';

interface SourceData {
  id: string;
  source_name: string;
  source_type: string;
  cost_per_period: number;
  applications_count: number;
  hires_count: number;
  quality_score: number;
  period_start: string;
  period_end: string;
  created_at: string;
}

const SOURCE_TYPES = ["job_board", "referral", "agency", "social_media", "career_site", "event", "other"];

const EMPTY_FORM = {
  source_name: "", source_type: "job_board", cost_per_period: 0,
  applications_count: 0, hires_count: 0, quality_score: 0,
};

export default function SourceEffectiveness() {
  const { t } = useTranslation('pages');
  const [sources, setSources] = useState<SourceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<SourceData | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM });
  const { confirm, Dialog: ConfirmDialog } = useConfirmDialog();
  const { error, handleError, clearError } = useErrorHandler();

  useEffect(() => { fetchSources(); }, []);

  const fetchSources = async () => {
    try {
      setLoading(true);
      clearError();
      const { data, error: fetchError } = await supabase
        .from("source_tracking")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      if (data) setSources(data);
    } catch (err) {
      handleError(err, { showToast: true });
    } finally {
      setLoading(false);
    }
  };

  const saveSource = async () => {
    const { error } = await supabase.from("source_tracking").insert({
      ...form,
      period_start: new Date().toISOString(),
      period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
    });
    if (!error) {
      toast.success(t('toast.sourceDataAdded', 'Source data added'));
      setDialogOpen(false);
      setForm({ ...EMPTY_FORM });
      fetchSources();
    }
  };

  const openEditDialog = (source: SourceData) => {
    setEditingSource(source);
    setEditForm({
      source_name: source.source_name || "",
      source_type: source.source_type || "job_board",
      cost_per_period: source.cost_per_period || 0,
      applications_count: source.applications_count || 0,
      hires_count: source.hires_count || 0,
      quality_score: source.quality_score || 0,
    });
    setEditDialogOpen(true);
  };

  const updateSource = async () => {
    if (!editingSource) return;
    const { error } = await supabase.from("source_tracking").update({
      source_name: editForm.source_name,
      source_type: editForm.source_type,
      cost_per_period: editForm.cost_per_period,
      applications_count: editForm.applications_count,
      hires_count: editForm.hires_count,
      quality_score: editForm.quality_score,
    }).eq("id", editingSource.id);
    if (!error) {
      toast.success(t('toast.sourceDataUpdated', 'Source data updated'));
      setEditDialogOpen(false);
      setEditingSource(null);
      fetchSources();
    } else {
      toast.error(t('toast.failedToUpdateSourceData', 'Failed to update source data'));
    }
  };

  const handleDeleteSource = (source: SourceData) => {
    confirm(
      {
        type: "delete",
        title: "Delete Source Data",
        description: `Are you sure you want to delete the source tracking entry for "${source.source_name}"? This action cannot be undone.`,
        confirmText: "Delete",
      },
      async () => {
        const { error } = await supabase.from("source_tracking").delete().eq("id", source.id);
        if (!error) {
          toast.success(t('toast.sourceDataDeleted', 'Source data deleted'));
          fetchSources();
        } else {
          toast.error(t('toast.failedToDeleteSourceData', 'Failed to delete source data'));
        }
      }
    );
  };

  const filtered = sources.filter(s => typeFilter === "all" || s.source_type === typeFilter);

  // Aggregate by source name
  const aggregated = (() => {
    const map: Record<string, { name: string; type: string; totalCost: number; totalApps: number; totalHires: number; avgQuality: number; count: number }> = {};
    filtered.forEach(s => {
      if (!map[s.source_name]) map[s.source_name] = { name: s.source_name, type: s.source_type, totalCost: 0, totalApps: 0, totalHires: 0, avgQuality: 0, count: 0 };
      const m = map[s.source_name];
      m.totalCost += s.cost_per_period || 0;
      m.totalApps += s.applications_count || 0;
      m.totalHires += s.hires_count || 0;
      m.avgQuality += s.quality_score || 0;
      m.count++;
    });
    return Object.values(map).map(m => ({
      ...m,
      avgQuality: m.count > 0 ? Math.round(m.avgQuality / m.count) : 0,
      costPerApp: m.totalApps > 0 ? Math.round(m.totalCost / m.totalApps) : 0,
      costPerHire: m.totalHires > 0 ? Math.round(m.totalCost / m.totalHires) : 0,
      conversionRate: m.totalApps > 0 ? Math.round((m.totalHires / m.totalApps) * 100) : 0,
    })).sort((a, b) => b.totalHires - a.totalHires);
  })();

  const totalSpend = aggregated.reduce((a, s) => a + s.totalCost, 0);
  const totalHires = aggregated.reduce((a, s) => a + s.totalHires, 0);
  const totalApps = aggregated.reduce((a, s) => a + s.totalApps, 0);
  const avgCostPerHire = totalHires > 0 ? Math.round(totalSpend / totalHires) : 0;
  const bestROI = aggregated.length > 0 ? aggregated.reduce((a, b) => (a.costPerHire > 0 && (a.costPerHire < b.costPerHire || b.costPerHire === 0)) ? a : b) : null;

  const renderSourceForm = (
    currentForm: typeof form,
    setCurrentForm: React.Dispatch<React.SetStateAction<typeof form>>
  ) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>{t('sourceName', 'Source Name')}</Label><Input value={currentForm.source_name} onChange={e => setCurrentForm(p => ({...p, source_name: e.target.value}))} placeholder={t('placeholder.linkedinJobs', 'LinkedIn Jobs')} /></div>
        <div>
          <Label>{t('sourceType', 'Source Type')}</Label>
          <Select value={currentForm.source_type} onValueChange={v => setCurrentForm(p => ({...p, source_type: v}))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{SOURCE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>{t("cost_eur", "Cost (EUR)")}</Label><Input type="number" value={currentForm.cost_per_period} onChange={e => setCurrentForm(p => ({...p, cost_per_period: Number(e.target.value)}))} /></div>
        <div><Label>{t("quality_score_0100", "Quality Score (0-100)")}</Label><Input type="number" value={currentForm.quality_score} onChange={e => setCurrentForm(p => ({...p, quality_score: Number(e.target.value)}))} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>{t("applications", "Applications")}</Label><Input type="number" value={currentForm.applications_count} onChange={e => setCurrentForm(p => ({...p, applications_count: Number(e.target.value)}))} /></div>
        <div><Label>{t("hires", "Hires")}</Label><Input type="number" value={currentForm.hires_count} onChange={e => setCurrentForm(p => ({...p, hires_count: Number(e.target.value)}))} /></div>
      </div>
    </div>
  );

  const LoadingSkeleton = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}><CardHeader className="pb-2"><Skeleton className="h-4 w-20 mb-2" /><Skeleton className="h-8 w-24" /></CardHeader></Card>
        ))}
      </div>
      <Card>
        <CardHeader><Skeleton className="h-6 w-48 mb-1" /><Skeleton className="h-4 w-72" /></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <RoleGate allowedRoles={["admin"]}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Breadcrumbs />
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Crosshair className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">{t('sourceEffectiveness', 'SOURCE EFFECTIVENESS')}</h1>
            </div>
            <p className="text-muted-foreground">{t('costperhireQualityofhireAndRoiBy', 'Cost-per-hire, quality-of-hire, and ROI by recruiting source')}</p>
          </div>
          <div className="flex gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allTypes', 'All Types')}</SelectItem>
                {SOURCE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />{t('addSourceData', 'Add Source Data')}</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t('addSourceTrackingData', 'Add Source Tracking Data')}</DialogTitle></DialogHeader>
                {renderSourceForm(form, setForm)}
                <DialogFooter><Button onClick={saveSource} disabled={!form.source_name}>{t("save", "Save")}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {error ? (
          <ErrorState
            title={t('title.failedToLoadSourceData', 'Failed to Load Source Data')}
            message={error.message}
            onRetry={fetchSources}
            variant="card"
          />
        ) : loading ? (
          <LoadingSkeleton />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card><CardHeader className="pb-2"><CardDescription>{t('totalSpend', 'Total Spend')}</CardDescription><CardTitle className="text-2xl">{"\u20AC"}{totalSpend.toLocaleString()}</CardTitle></CardHeader></Card>
              <Card><CardHeader className="pb-2"><CardDescription>{t('totalHires', 'Total Hires')}</CardDescription><CardTitle className="text-2xl text-green-600">{totalHires}</CardTitle></CardHeader></Card>
              <Card><CardHeader className="pb-2"><CardDescription>{t('totalApplications', 'Total Applications')}</CardDescription><CardTitle className="text-2xl">{totalApps}</CardTitle></CardHeader></Card>
              <Card><CardHeader className="pb-2"><CardDescription>{t("avg_costhire", "Avg Cost/Hire")}</CardDescription><CardTitle className="text-2xl">{"\u20AC"}{avgCostPerHire.toLocaleString()}</CardTitle></CardHeader></Card>
              <Card className="border-green-500/50"><CardHeader className="pb-2"><CardDescription>{t('bestRoiSource', 'Best ROI Source')}</CardDescription><CardTitle className="text-lg text-green-600">{bestROI?.name || "\u2014"}</CardTitle></CardHeader></Card>
            </div>

            <Card>
              <CardHeader><CardTitle>{t('sourceComparison', 'Source Comparison')}</CardTitle><CardDescription>{t('aggregatedPerformanceMetricsPerSource', 'Aggregated performance metrics per source')}</CardDescription></CardHeader>
              <CardContent>
                {aggregated.length === 0 ? (
                  <p className="text-muted-foreground text-center py-12">{t('noSourceTrackingDataYet', 'No source tracking data yet. Add source data to begin analyzing ROI.')}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("source", "Source")}</TableHead>
                        <TableHead>{t("type", "Type")}</TableHead>
                        <TableHead>{t('totalCost', 'Total Cost')}</TableHead>
                        <TableHead>{t("applications", "Applications")}</TableHead>
                        <TableHead>{t("hires", "Hires")}</TableHead>
                        <TableHead>{t("costapp", "Cost/App")}</TableHead>
                        <TableHead>{t("costhire", "Cost/Hire")}</TableHead>
                        <TableHead>{t("conversion", "Conversion")}</TableHead>
                        <TableHead>{t("quality", "Quality")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aggregated.map(s => (
                        <TableRow key={s.name}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell><Badge variant="outline">{s.type.replace("_", " ")}</Badge></TableCell>
                          <TableCell>{"\u20AC"}{s.totalCost.toLocaleString()}</TableCell>
                          <TableCell>{s.totalApps}</TableCell>
                          <TableCell><Badge variant={s.totalHires > 0 ? "default" : "secondary"}>{s.totalHires}</Badge></TableCell>
                          <TableCell className="font-mono">{"\u20AC"}{s.costPerApp}</TableCell>
                          <TableCell className="font-mono">
                            <div className="flex items-center gap-1">
                              {"\u20AC"}{s.costPerHire.toLocaleString()}
                              {s.costPerHire > 0 && s.costPerHire < avgCostPerHire && <TrendingDown className="h-3 w-3 text-green-500" />}
                              {s.costPerHire > avgCostPerHire * 1.5 && <TrendingUp className="h-3 w-3 text-red-500" />}
                            </div>
                          </TableCell>
                          <TableCell>{s.conversionRate}%</TableCell>
                          <TableCell>
                            <Badge variant={s.avgQuality >= 70 ? "default" : s.avgQuality >= 40 ? "secondary" : "destructive"}>
                              {s.avgQuality}/100
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Visual bar comparison */}
            {aggregated.length > 0 && (
              <Card>
                <CardHeader><CardTitle>{t('costPerHireComparison', 'Cost per Hire Comparison')}</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {aggregated.filter(s => s.costPerHire > 0).sort((a, b) => a.costPerHire - b.costPerHire).map(s => {
                      const maxCost = Math.max(...aggregated.map(a => a.costPerHire), 1);
                      const pct = (s.costPerHire / maxCost) * 100;
                      return (
                        <div key={s.name} className="flex items-center gap-3">
                          <span className="w-32 text-sm font-medium truncate">{s.name}</span>
                          <div className="flex-1 bg-muted rounded-full h-4">
                            <div className={`rounded-full h-4 ${s.costPerHire < avgCostPerHire ? "bg-green-500" : s.costPerHire > avgCostPerHire * 1.5 ? "bg-red-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-24 text-sm font-mono text-right">{"\u20AC"}{s.costPerHire.toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Individual source entries */}
            <Card>
              <CardHeader>
                <CardTitle>{t('individualSourceEntries', 'Individual Source Entries')}</CardTitle>
                <CardDescription>{t('clickARowToEdit', 'Click a row to edit, or use the action buttons')}</CardDescription>
              </CardHeader>
              <CardContent>
                {filtered.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">{t('noIndividualEntriesToDisplay', 'No individual entries to display.')}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('sourceName1', 'Source Name')}</TableHead>
                        <TableHead>{t("type", "Type")}</TableHead>
                        <TableHead>{t("cost", "Cost")}</TableHead>
                        <TableHead>{t("applications", "Applications")}</TableHead>
                        <TableHead>{t("hires", "Hires")}</TableHead>
                        <TableHead>{t("quality", "Quality")}</TableHead>
                        <TableHead>{t("added", "Added")}</TableHead>
                        <TableHead className="text-right">{t("actions", "Actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(s => (
                        <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEditDialog(s)}>
                          <TableCell className="font-medium">{s.source_name}</TableCell>
                          <TableCell><Badge variant="outline">{s.source_type.replace("_", " ")}</Badge></TableCell>
                          <TableCell>{"\u20AC"}{(s.cost_per_period || 0).toLocaleString()}</TableCell>
                          <TableCell>{s.applications_count || 0}</TableCell>
                          <TableCell>{s.hires_count || 0}</TableCell>
                          <TableCell>{s.quality_score || 0}/100</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {s.created_at ? formatDistanceToNow(new Date(s.created_at), { addSuffix: true }) : "\u2014"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); openEditDialog(s); }}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-destructive" onClick={e => { e.stopPropagation(); handleDeleteSource(s); }}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Edit Source Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setEditingSource(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Source Data: {editingSource?.source_name}</DialogTitle>
            </DialogHeader>
            {renderSourceForm(editForm, setEditForm)}
            <DialogFooter><Button onClick={updateSource} disabled={!editForm.source_name}>{t('saveChanges', 'Save Changes')}</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <ConfirmDialog />
      </div>
    </RoleGate>
  );
}

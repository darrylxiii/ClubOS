import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirmDialog } from "@/components/ui/ConfirmActionDialog";
import { GitBranch, Plus, Trash2, Copy, ArrowRight, Star, GripVertical, Pencil, Search, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useTranslation } from 'react-i18next';

// ─── Types ───────────────────────────────────────────────────────

interface PipelineStage {
  name: string;
  color: string;
}

interface StageTemplate {
  id: string;
  name: string;
  description: string;
  stages: PipelineStage[];
  is_default: boolean;
  department: string;
  created_at: string;
  usage_count?: number;
}

const DEFAULT_COLORS = [
  "#6B7280", "#3B82F6", "#8B5CF6", "#F59E0B",
  "#10B981", "#059669", "#EF4444", "#EC4899",
];

const DEFAULT_STAGES: PipelineStage[] = [
  { name: "Applied", color: "#6B7280" },
  { name: "Interview", color: "#3B82F6" },
  { name: "Offer", color: "#10B981" },
  { name: "Hired", color: "#059669" },
];

// ─── Skeleton loaders ────────────────────────────────────────────

function StatsSkeleton() {
  const { t } = useTranslation('pages');
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16" />
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

function CardSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-40 mb-2" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-5 w-20 mt-1" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-3 w-3" />
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-3 w-3" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

// ─── Component ───────────────────────────────────────────────────

export default function PipelineStageManager() {
  const [templates, setTemplates] = useState<StageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<StageTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const [form, setForm] = useState({
    name: "",
    description: "",
    department: "",
    stages: [...DEFAULT_STAGES],
  });

  const { confirm, Dialog: ConfirmDialog } = useConfirmDialog();

  // ─── Data fetching ────────────────────────────────────────

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);

    // Fetch templates
    const { data: templateData, error } = await supabase
      .from("pipeline_stage_templates")
      .select("*")
      .order("is_default", { ascending: false });

    if (error) {
      console.error("Error fetching templates:", error);
      toast.error(t('toast.failedToLoadPipelineTemplates', 'Failed to load pipeline templates'));
      setLoading(false);
      return;
    }

    // Fetch usage counts: count jobs that have pipeline_stages matching each template
    // Since there's no FK, we count jobs per matching stages JSON
    const { data: jobsData } = await supabase
      .from("jobs")
      .select("id, pipeline_stages");

    const usageCounts: Record<string, number> = {};
    if (templateData && jobsData) {
      for (const template of templateData) {
        const templateStageNames = (template.stages || [])
          .map((s: any) => s.name)
          .sort()
          .join("|");

        let count = 0;
        for (const job of jobsData) {
          const jobStageNames = (job.pipeline_stages as any[] || [])
            .map((s: any) => s.name)
            .sort()
            .join("|");

          if (templateStageNames === jobStageNames) {
            count++;
          }
        }
        usageCounts[template.id] = count;
      }
    }

    const enriched: StageTemplate[] = (templateData || []).map((t: any) => ({
      ...t,
      usage_count: usageCounts[t.id] || 0,
    }));

    setTemplates(enriched);
    setLoading(false);
  };

  // ─── Form helpers ─────────────────────────────────────────

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      department: "",
      stages: [...DEFAULT_STAGES],
    });
    setEditingTemplate(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (template: StageTemplate) => {
    setEditingTemplate(template);
    setForm({
      name: template.name,
      description: template.description || "",
      department: template.department || "",
      stages: (template.stages || []).map((s) => ({ ...s })),
    });
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    setDialogOpen(open);
  };

  const addStage = () =>
    setForm((p) => ({
      ...p,
      stages: [
        ...p.stages,
        { name: "", color: DEFAULT_COLORS[p.stages.length % DEFAULT_COLORS.length] },
      ],
    }));

  const removeStage = (idx: number) =>
    setForm((p) => ({ ...p, stages: p.stages.filter((_, i) => i !== idx) }));

  // ─── CRUD operations ──────────────────────────────────────

  const saveTemplate = async () => {
    const stages = form.stages.filter((s) => s.name.trim());

    if (editingTemplate) {
      // UPDATE existing template
      const { error } = await supabase
        .from("pipeline_stage_templates")
        .update({
          name: form.name,
          description: form.description,
          department: form.department,
          stages,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingTemplate.id);

      if (error) {
        toast.error(t('toast.failedToUpdateTemplate', 'Failed to update template'));
        return;
      }
      toast.success(t('toast.pipelineTemplateUpdated', 'Pipeline template updated'));
    } else {
      // INSERT new template
      const { error } = await supabase.from("pipeline_stage_templates").insert({
        name: form.name,
        description: form.description,
        department: form.department,
        stages,
        is_default: false,
      });

      if (error) {
        toast.error(t('toast.failedToCreateTemplate', 'Failed to create template'));
        return;
      }
      toast.success(t('toast.pipelineTemplateCreated', 'Pipeline template created'));
    }

    setDialogOpen(false);
    resetForm();
    fetchTemplates();
  };

  const duplicateTemplate = async (template: StageTemplate) => {
    const { error } = await supabase.from("pipeline_stage_templates").insert({
      name: `${template.name} (Copy)`,
      description: template.description,
      department: template.department,
      stages: template.stages,
      is_default: false,
    });
    if (!error) {
      toast.success(t('toast.templateDuplicated', 'Template duplicated'));
      fetchTemplates();
    }
  };

  const setAsDefault = async (id: string) => {
    await supabase
      .from("pipeline_stage_templates")
      .update({ is_default: false })
      .neq("id", id);
    await supabase
      .from("pipeline_stage_templates")
      .update({ is_default: true })
      .eq("id", id);
    toast.success(t('toast.defaultTemplateUpdated', 'Default template updated'));
    fetchTemplates();
  };

  const handleDelete = (template: StageTemplate) => {
    confirm(
      {
        type: "delete",
        title: "Delete Template",
        description: `Are you sure you want to delete "${template.name}"? This action cannot be undone.${
          (template.usage_count ?? 0) > 0
            ? ` This template is currently used by ${template.usage_count} job(s).`
            : ""
        }`,
        confirmText: "Delete Template",
      },
      async () => {
        const { error } = await supabase
          .from("pipeline_stage_templates")
          .delete()
          .eq("id", template.id);

        if (error) {
          toast.error(t('toast.failedToDeleteTemplate', 'Failed to delete template'));
          return;
        }
        toast.success(t('toast.templateDeleted', 'Template deleted'));
        fetchTemplates();
      },
    );
  };

  // ─── Filtering ────────────────────────────────────────────

  const departments = useMemo(() => {
    const depts = new Set<string>();
    templates.forEach((t) => {
      if (t.department) depts.add(t.department);
    });
    return Array.from(depts).sort();
  }, [templates]);

  const filtered = useMemo(() => {
    let result = templates;

    // Department filter
    if (departmentFilter !== "all") {
      result = result.filter((t) => t.department === departmentFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.description || "").toLowerCase().includes(q) ||
          (t.department || "").toLowerCase().includes(q),
      );
    }

    return result;
  }, [templates, departmentFilter, searchQuery]);

  // ─── Stats ────────────────────────────────────────────────

  const totalJobs = templates.reduce((sum, t) => sum + (t.usage_count ?? 0), 0);

  // ─── Render ───────────────────────────────────────────────

  return (
    <RoleGate allowedRoles={["admin"]}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <GitBranch className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">{t('pipelineStages', 'PIPELINE STAGES')}</h1>
            </div>
            <p className="text-muted-foreground">{t('configureHiringPipelineStageTemplates', 'Configure hiring pipeline stage templates for jobs')}</p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />{t('newTemplate', 'New Template')}</Button>
        </div>

        {/* Stats */}
        {loading ? (
          <StatsSkeleton />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("templates", "Templates")}</CardDescription>
                <CardTitle className="text-2xl">{templates.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('defaultTemplate', 'Default Template')}</CardDescription>
                <CardTitle className="text-lg truncate">
                  {templates.find((t) => t.is_default)?.name || "None"}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('avgStages', 'Avg Stages')}</CardDescription>
                <CardTitle className="text-2xl">
                  {templates.length > 0
                    ? Math.round(
                        templates.reduce((a, t) => a + (t.stages || []).length, 0) /
                          templates.length,
                      )
                    : 0}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('jobsUsingTemplates', 'Jobs Using Templates')}</CardDescription>
                <CardTitle className="text-2xl">{totalJobs}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* Search / filter bar */}
        {!loading && templates.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('placeholder.searchTemplates', 'Search templates...')}
                className="pl-8 w-56"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {departments.length > 0 && (
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder={t('placeholder.allDepartments', 'All Departments')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allDepartments', 'All Departments')}</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* Template cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <CardSkeleton />
          ) : filtered.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center text-muted-foreground">
                {templates.length === 0
                  ? "No pipeline templates. Default templates will be seeded from the migration."
                  : "No templates match the current filters."}
              </CardContent>
            </Card>
          ) : (
            filtered.map((t) => (
              <Card key={t.id} className={t.is_default ? "border-primary/50" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{t.name}</CardTitle>
                    <div className="flex gap-1 items-center">
                      {t.is_default && (
                        <Badge className="bg-amber-500">
                          <Star className="h-3 w-3 mr-1" />
                          Default
                        </Badge>
                      )}
                    </div>
                  </div>
                  {t.description && <CardDescription>{t.description}</CardDescription>}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {t.department && <Badge variant="outline">{t.department}</Badge>}
                    <Badge variant="secondary" className="text-xs">
                      <Briefcase className="h-3 w-3 mr-1" />
                      {t.usage_count ?? 0} job{(t.usage_count ?? 0) !== 1 ? "s" : ""}
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Stage pipeline preview */}
                  <div className="flex items-center gap-1 flex-wrap mb-4">
                    {(t.stages || []).map((s: PipelineStage, i: number) => (
                      <span key={i} className="flex items-center gap-1">
                        <Badge
                          style={{ backgroundColor: s.color, color: "#fff" }}
                          className="text-xs"
                        >
                          {s.name}
                        </Badge>
                        {i < (t.stages || []).length - 1 && (
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        )}
                      </span>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => openEditDialog(t)}>
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    {!t.is_default && (
                      <Button size="sm" variant="outline" onClick={() => setAsDefault(t.id)}>
                        <Star className="h-3 w-3 mr-1" />{t('setDefault', 'Set Default')}</Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => duplicateTemplate(t)}>
                      <Copy className="h-3 w-3 mr-1" />
                      Clone
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive ml-auto"
                      onClick={() => handleDelete(t)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* ─── Create / Edit Dialog ──────────────────────────── */}
        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Edit Pipeline Template" : "Create Pipeline Template"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Name + Department */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('templateName', 'Template Name')}</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder={t('placeholder.engineeringPipeline', 'Engineering Pipeline')}
                  />
                </div>
                <div>
                  <Label>{t("department", "Department")}</Label>
                  <Input
                    value={form.department}
                    onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
                    placeholder={t('placeholder.engineering', 'Engineering')}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <Label>{t("description", "Description")}</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder={t('placeholder.pipelineForEngineeringRoles', 'Pipeline for engineering roles')}
                />
              </div>

              {/* Stages */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t("stages_drag_to_reorder", "Stages (drag to reorder)")}</Label>
                  <Button size="sm" variant="outline" onClick={addStage}>
                    <Plus className="h-3 w-3 mr-1" />{t('addStage', 'Add Stage')}</Button>
                </div>
                {form.stages.map((stage, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 border rounded">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <Badge variant="outline" className="shrink-0">
                      {i + 1}
                    </Badge>
                    <input
                      type="color"
                      value={stage.color}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          stages: p.stages.map((s, j) =>
                            j === i ? { ...s, color: e.target.value } : s,
                          ),
                        }))
                      }
                      className="w-8 h-8 rounded cursor-pointer border-0"
                    />
                    <Input
                      value={stage.name}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          stages: p.stages.map((s, j) =>
                            j === i ? { ...s, name: e.target.value } : s,
                          ),
                        }))
                      }
                      placeholder={t('placeholder.stageName', 'Stage name')}
                      className="flex-1"
                    />
                    {form.stages.length > 2 && (
                      <Button size="sm" variant="ghost" onClick={() => removeStage(i)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Preview */}
              <div>
                <Label>{t("preview", "Preview")}</Label>
                <div className="flex items-center gap-1 mt-2 flex-wrap">
                  {form.stages
                    .filter((s) => s.name)
                    .map((stage, i, arr) => (
                      <span key={i} className="flex items-center gap-1">
                        <Badge style={{ backgroundColor: stage.color, color: "#fff" }}>
                          {stage.name}
                        </Badge>
                        {i < arr.length - 1 && (
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        )}
                      </span>
                    ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleDialogClose(false)}>
                Cancel
              </Button>
              <Button
                onClick={saveTemplate}
                disabled={!form.name || form.stages.filter((s) => s.name).length < 2}
              >
                {editingTemplate ? "Save Changes" : "Create Template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirm dialog rendered from hook */}
        <ConfirmDialog />
      </div>
    </RoleGate>
  );
}

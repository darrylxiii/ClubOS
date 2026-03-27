import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { supabase } from "@/integrations/supabase/client";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirmDialog } from "@/components/ui/ConfirmActionDialog";
import { FileText, Plus, Copy, Trash2, Eye, Search, Pencil } from "lucide-react";
import { toast } from "sonner";

interface JobTemplate {
  id: string;
  name: string;
  department: string;
  template_data: {
    title?: string;
    description?: string;
    requirements?: string;
    benefits?: string;
    location_type?: string;
    employment_type?: string;
  };
  is_global: boolean;
  usage_count: number;
  created_at: string;
}

const emptyForm = {
  name: "", department: "", is_global: false,
  template_data: { title: "", description: "", requirements: "", benefits: "", location_type: "remote", employment_type: "full_time" },
};

export default function JobPostingTemplates() {
  const { t } = useTranslation('admin');
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<JobTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<JobTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [form, setForm] = useState({ ...emptyForm });

  const { confirm, Dialog: ConfirmDialog } = useConfirmDialog();

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data } = await supabase.from("job_posting_templates").select("*").order("usage_count", { ascending: false });
    if (data) setTemplates(data);
    setLoading(false);
  };

  const resetFormAndClose = () => {
    setForm({ ...emptyForm });
    setEditingTemplate(null);
    setDialogOpen(false);
  };

  const openCreateDialog = () => {
    setEditingTemplate(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  const openEditDialog = (t: JobTemplate) => {
    setEditingTemplate(t);
    const td = t.template_data || {};
    setForm({
      name: t.name || "",
      department: t.department || "",
      is_global: t.is_global || false,
      template_data: {
        title: td.title || "",
        description: td.description || "",
        requirements: td.requirements || "",
        benefits: td.benefits || "",
        location_type: td.location_type || "remote",
        employment_type: td.employment_type || "full_time",
      },
    });
    setDialogOpen(true);
  };

  const saveTemplate = async () => {
    if (editingTemplate) {
      const { error } = await supabase.from("job_posting_templates").update({
        name: form.name, department: form.department,
        template_data: form.template_data, is_global: form.is_global,
      }).eq("id", editingTemplate.id);
      if (!error) {
        toast.success(t('text.jobpostingtemplates.templateUpdated', 'Template updated'));
        resetFormAndClose();
        fetchTemplates();
      } else {
        toast.error(t('text.jobpostingtemplates.failedToUpdateTemplate', 'Failed to update template'));
      }
    } else {
      const { error } = await supabase.from("job_posting_templates").insert({
        name: form.name, department: form.department,
        template_data: form.template_data, is_global: form.is_global, usage_count: 0,
      });
      if (!error) {
        toast.success(t('text.jobpostingtemplates.templateCreated', 'Template created'));
        resetFormAndClose();
        fetchTemplates();
      } else {
        toast.error(t('text.jobpostingtemplates.failedToCreateTemplate', 'Failed to create template'));
      }
    }
  };

  const duplicateTemplate = async (t: JobTemplate) => {
    const { error } = await supabase.from("job_posting_templates").insert({
      name: `${t.name} (Copy)`, department: t.department,
      template_data: t.template_data, is_global: false, usage_count: 0,
    });
    if (!error) { toast.success(t('text.jobpostingtemplates.templateDuplicated', 'Template duplicated')); fetchTemplates(); }
  };

  const deleteTemplate = (id: string, templateName: string) => {
    confirm(
      {
        type: "delete",
        title: t('text.jobpostingtemplates.deleteTemplate', 'Delete Template'),
        description: `Are you sure you want to delete the template "${templateName}"? This action cannot be undone.`,
        confirmText: "Delete Template",
      },
      async () => {
        await supabase.from("job_posting_templates").delete().eq("id", id);
        toast.success(t('text.jobpostingtemplates.templateDeleted', 'Template deleted'));
        fetchTemplates();
      }
    );
  };

  const departments = [...new Set(templates.map(t => t.department).filter(Boolean))];
  const filtered = templates.filter(t => {
    if (deptFilter !== "all" && t.department !== deptFilter) return false;
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase()) && !t.department?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <RoleGate allowedRoles={["admin"]}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">{'JOB POSTING TEMPLATES'}</h1>
            </div>
            <p className="text-muted-foreground">{'Reusable job description templates by department'}</p>
          </div>
          <Button onClick={openCreateDialog}><Plus className="h-4 w-4 mr-2" />{'New Template'}</Button>
        </div>

        {/* Create / Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetFormAndClose(); else setDialogOpen(true); }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? t('text.jobpostingtemplates.editJobPostingTemplate', 'Edit Job Posting Template') : t('text.jobpostingtemplates.createJobPostingTemplate', 'Create Job Posting Template')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>{'Template Name'}</Label><Input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder={'Senior Engineer Template'} /></div>
                <div><Label>{t('jobPostingTemplates.text1')}</Label><Input value={form.department} onChange={e => setForm(p => ({...p, department: e.target.value}))} placeholder={'Engineering'} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{'Location Type'}</Label>
                  <Select value={form.template_data.location_type} onValueChange={v => setForm(p => ({...p, template_data: {...p.template_data, location_type: v}}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="remote">{t('jobPostingTemplates.text2')}</SelectItem>
                      <SelectItem value="hybrid">{t('jobPostingTemplates.text3')}</SelectItem>
                      <SelectItem value="onsite">{'On-site'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{'Employment Type'}</Label>
                  <Select value={form.template_data.employment_type} onValueChange={v => setForm(p => ({...p, template_data: {...p.template_data, employment_type: v}}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">{'Full-time'}</SelectItem>
                      <SelectItem value="part_time">{'Part-time'}</SelectItem>
                      <SelectItem value="contract">{t('jobPostingTemplates.text4')}</SelectItem>
                      <SelectItem value="internship">{t('jobPostingTemplates.text5')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>{'Job Title Template'}</Label><Input value={form.template_data.title} onChange={e => setForm(p => ({...p, template_data: {...p.template_data, title: e.target.value}}))} placeholder={'Senior [Role] Engineer'} /></div>
              <div><Label>{t('jobPostingTemplates.text6')}</Label><Textarea value={form.template_data.description} onChange={e => setForm(p => ({...p, template_data: {...p.template_data, description: e.target.value}}))} rows={4} placeholder={t('jobPostingTemplates.text7')} /></div>
              <div><Label>{t('jobPostingTemplates.text8')}</Label><Textarea value={form.template_data.requirements} onChange={e => setForm(p => ({...p, template_data: {...p.template_data, requirements: e.target.value}}))} rows={4} placeholder={"- 5+ years experience..."} /></div>
              <div><Label>{t('jobPostingTemplates.text9')}</Label><Textarea value={form.template_data.benefits} onChange={e => setForm(p => ({...p, template_data: {...p.template_data, benefits: e.target.value}}))} rows={3} placeholder={"- Competitive salary..."} /></div>
            </div>
            <DialogFooter>
              <Button onClick={saveTemplate} disabled={!form.name}>
                {editingTemplate ? t('text.jobpostingtemplates.saveChanges', 'Save Changes') : t('text.jobpostingtemplates.createTemplate', 'Create Template')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Stats Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}><CardHeader className="pb-2"><Skeleton variant="text" className="h-4 w-24 mb-2" /><Skeleton className="h-8 w-16" /></CardHeader></Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardHeader className="pb-2"><CardDescription>{t('jobPostingTemplates.text10')}</CardDescription><CardTitle className="text-2xl">{templates.length}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>{t('jobPostingTemplates.text11')}</CardDescription><CardTitle className="text-2xl">{departments.length}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>{'Total Uses'}</CardDescription><CardTitle className="text-2xl">{templates.reduce((a, t) => a + (t.usage_count || 0), 0)}</CardTitle></CardHeader></Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={'Search templates...'} className="pl-9" />
          </div>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{'All Departments'}</SelectItem>
              {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Template Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton variant="text" className="h-6 w-3/4 mb-2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton variant="text" className="h-4 w-full mb-1" />
                  <Skeleton variant="text" className="h-4 w-full mb-1" />
                  <Skeleton variant="text" className="h-4 w-2/3 mb-3" />
                  <div className="flex items-center justify-between">
                    <Skeleton variant="text" className="h-3 w-20" />
                    <div className="flex gap-1">
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(t => (
              <Card key={t.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{t.name}</CardTitle>
                    {t.is_global && <Badge className="bg-blue-500">{t('jobPostingTemplates.text12')}</Badge>}
                  </div>
                  <div className="flex gap-2">
                    {t.department && <Badge variant="outline">{t.department}</Badge>}
                    <Badge variant="secondary">{(t.template_data as any)?.location_type || "remote"}</Badge>
                    <Badge variant="secondary">{((t.template_data as any)?.employment_type || "full_time").replace("_", " ")}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {(t.template_data as any)?.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{(t.template_data as any).description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Used {t.usage_count || 0} times</span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(t)} title={'Edit template'}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setPreviewTemplate(t)} title={'Preview template'}>
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => duplicateTemplate(t)} title={'Duplicate template'}>
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteTemplate(t.id, t.name)} title={'Delete template'}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filtered.length === 0 && (
              <Card className="col-span-full"><CardContent className="py-12 text-center text-muted-foreground">
                {templates.length === 0 ? t('text.jobpostingtemplates.noJobPostingTemplatesCreateOne', 'No job posting templates. Create one to standardize your job descriptions.') : t('text.jobpostingtemplates.noTemplatesMatchTheSearch', 'No templates match the search.')}
              </CardContent></Card>
            )}
          </div>
        )}

        {/* Preview Dialog */}
        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            {previewTemplate && (
              <>
                <DialogHeader><DialogTitle>{previewTemplate.name}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    {previewTemplate.department && <Badge variant="outline">{previewTemplate.department}</Badge>}
                    <Badge variant="secondary">{(previewTemplate.template_data as any)?.location_type}</Badge>
                    <Badge variant="secondary">{((previewTemplate.template_data as any)?.employment_type || "").replace("_", " ")}</Badge>
                  </div>
                  {(previewTemplate.template_data as any)?.title && (
                    <div><h4 className="font-semibold text-sm mb-1">{'Title Template'}</h4><p className="text-sm">{(previewTemplate.template_data as any).title}</p></div>
                  )}
                  {(previewTemplate.template_data as any)?.description && (
                    <div><h4 className="font-semibold text-sm mb-1">{t('jobPostingTemplates.text13')}</h4><p className="text-sm whitespace-pre-wrap">{(previewTemplate.template_data as any).description}</p></div>
                  )}
                  {(previewTemplate.template_data as any)?.requirements && (
                    <div><h4 className="font-semibold text-sm mb-1">{t('jobPostingTemplates.text14')}</h4><p className="text-sm whitespace-pre-wrap">{(previewTemplate.template_data as any).requirements}</p></div>
                  )}
                  {(previewTemplate.template_data as any)?.benefits && (
                    <div><h4 className="font-semibold text-sm mb-1">{t('jobPostingTemplates.text15')}</h4><p className="text-sm whitespace-pre-wrap">{(previewTemplate.template_data as any).benefits}</p></div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Confirm Delete Dialog */}
        <ConfirmDialog />
      </div>
    </RoleGate>
  );
}

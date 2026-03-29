import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirmDialog } from "@/components/ui/ConfirmActionDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Plus, Eye, Code, Smartphone, Monitor, Copy, Trash2, Send, Tag, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { useTranslation } from 'react-i18next';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  body_text: string;
  category: string;
  language: string;
  created_at: string;
  updated_at: string;
}

const MERGE_TAGS = [
  { tag: "{{candidate_name}}", label: "Candidate Name" },
  { tag: "{{candidate_email}}", label: "Candidate Email" },
  { tag: "{{job_title}}", label: "Job Title" },
  { tag: "{{company_name}}", label: "Company Name" },
  { tag: "{{recruiter_name}}", label: "Recruiter Name" },
  { tag: "{{interview_date}}", label: "Interview Date" },
  { tag: "{{interview_time}}", label: "Interview Time" },
  { tag: "{{offer_amount}}", label: "Offer Amount" },
  { tag: "{{portal_link}}", label: "Portal Link" },
];

const CATEGORIES = ["outreach", "follow_up", "scheduling", "offer", "rejection", "onboarding", "general"];

export default function EmailTemplateBuilder() {
  const { t } = useTranslation('pages');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editMode, setEditMode] = useState<"visual" | "html">("visual");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [form, setForm] = useState({ name: "", subject: "", body_html: "", body_text: "", category: "general", language: "en" });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { confirm, Dialog: ConfirmDialog } = useConfirmDialog();

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data } = await supabase.from("email_templates").select("*").order("updated_at", { ascending: false });
    if (data) setTemplates(data);
    setLoading(false);
  };

  const openEditor = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setForm({
      name: template.name || "",
      subject: template.subject || "",
      body_html: template.body_html || "",
      body_text: template.body_text || "",
      category: template.category || "general",
      language: template.language || "en",
    });
  };

  const saveTemplate = async () => {
    if (selectedTemplate) {
      const { error } = await supabase.from("email_templates").update({
        name: form.name, subject: form.subject, body_html: form.body_html,
        body_text: form.body_text, category: form.category, language: form.language,
      }).eq("id", selectedTemplate.id);
      if (!error) { toast.success(t('toast.templateSaved', 'Template saved')); fetchTemplates(); }
    } else {
      const { error } = await supabase.from("email_templates").insert({
        name: form.name, subject: form.subject, body_html: form.body_html,
        body_text: form.body_text, category: form.category, language: form.language,
      });
      if (!error) {
        toast.success(t('toast.templateCreated', 'Template created'));
        setDialogOpen(false);
        setForm({ name: "", subject: "", body_html: "", body_text: "", category: "general", language: "en" });
        fetchTemplates();
      }
    }
  };

  const duplicateTemplate = async (t: EmailTemplate) => {
    const { error } = await supabase.from("email_templates").insert({
      name: `${t.name} (Copy)`, subject: t.subject, body_html: t.body_html,
      body_text: t.body_text, category: t.category, language: t.language,
    });
    if (!error) { toast.success(t('toast.templateDuplicated', 'Template duplicated')); fetchTemplates(); }
  };

  const handleDeleteTemplate = (t: EmailTemplate) => {
    confirm(
      {
        type: "delete",
        title: "Delete Email Template",
        description: `Are you sure you want to delete the template "${t.name}"? This action cannot be undone.`,
        confirmText: "Delete Template",
      },
      async () => {
        const { error } = await supabase.from("email_templates").delete().eq("id", t.id);
        if (!error) {
          toast.success(t('toast.templateDeleted', 'Template deleted'));
          if (selectedTemplate?.id === t.id) setSelectedTemplate(null);
          fetchTemplates();
        } else {
          toast.error(t('toast.failedToDeleteTemplate', 'Failed to delete template'));
        }
      }
    );
  };

  const insertMergeTag = (tag: string) => {
    const ta = textareaRef.current;
    if (ta) {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const field = editMode === "html" ? "body_html" : "body_text";
      const current = form[field];
      const newVal = current.slice(0, start) + tag + current.slice(end);
      setForm(p => ({ ...p, [field]: newVal }));
    } else {
      const field = editMode === "html" ? "body_html" : "body_text";
      setForm(p => ({ ...p, [field]: p[field] + tag }));
    }
  };

  const renderPreviewHTML = (html: string) => {
    let rendered = html;
    MERGE_TAGS.forEach(({ tag, label }) => {
      rendered = rendered.replaceAll(tag, `<span style="background:#e0e7ff;padding:1px 4px;border-radius:3px;font-size:0.85em">[${label}]</span>`);
    });
    return rendered;
  };

  const filtered = templates.filter(t => categoryFilter === "all" || t.category === categoryFilter);

  const TemplateListSkeleton = () => (
    <div className="space-y-3">
      <Skeleton className="h-4 w-24 mb-2" />
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <div className="flex items-center gap-1">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-7 w-7 rounded" />
                <Skeleton className="h-7 w-7 rounded" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const EditorSkeleton = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-9 w-28" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-6 w-32" />
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-24 rounded" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  );

  return (
    <RoleGate allowedRoles={["admin"]}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Mail className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">{t('emailTemplateBuilder', 'EMAIL TEMPLATE BUILDER')}</h1>
            </div>
            <p className="text-muted-foreground">{t('designPreviewAndManageEmail', 'Design, preview, and manage email templates with merge tags')}</p>
          </div>
          <div className="flex gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allCategories', 'All Categories')}</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />{t('newTemplate', 'New Template')}</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t('createEmailTemplate', 'Create Email Template')}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>{t('templateName', 'Template Name')}</Label><Input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder={t('placeholder.interviewInvitation', 'Interview Invitation')} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t("category", "Category")}</Label>
                      <Select value={form.category} onValueChange={v => setForm(p => ({...p, category: v}))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>{t("language", "Language")}</Label><Input value={form.language} onChange={e => setForm(p => ({...p, language: e.target.value}))} placeholder="en" /></div>
                  </div>
                  <div><Label>{t("subject", "Subject")}</Label><Input value={form.subject} onChange={e => setForm(p => ({...p, subject: e.target.value}))} placeholder={t('placeholder.youreInvitedToInterviewFor', "You're invited to interview for {{job_title}}")} /></div>
                  <div><Label>{t("body_html", "Body (HTML)")}</Label><Textarea value={form.body_html} onChange={e => setForm(p => ({...p, body_html: e.target.value}))} rows={6} placeholder="<p>Hi {{candidate_name}},</p>" /></div>
                </div>
                <DialogFooter><Button onClick={saveTemplate} disabled={!form.name || !form.subject}>{t("create", "Create")}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}><CardHeader className="pb-2"><Skeleton className="h-4 w-20 mb-2" /><Skeleton className="h-8 w-16" /></CardHeader></Card>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <TemplateListSkeleton />
              <div className="lg:col-span-2">
                <EditorSkeleton />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card><CardHeader className="pb-2"><CardDescription>{t("templates", "Templates")}</CardDescription><CardTitle className="text-2xl">{templates.length}</CardTitle></CardHeader></Card>
              <Card><CardHeader className="pb-2"><CardDescription>{t("categories", "Categories")}</CardDescription><CardTitle className="text-2xl">{new Set(templates.map(t => t.category)).size}</CardTitle></CardHeader></Card>
              <Card><CardHeader className="pb-2"><CardDescription>{t("languages", "Languages")}</CardDescription><CardTitle className="text-2xl">{new Set(templates.map(t => t.language).filter(Boolean)).size || 1}</CardTitle></CardHeader></Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Template List */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">{t("templates", "Templates")}</h3>
                {filtered.length === 0 ? (
                  <Card><CardContent className="py-8 text-center text-muted-foreground">{t('noTemplatesCreateOneTo', 'No templates. Create one to get started.')}</CardContent></Card>
                ) : (
                  filtered.map(t => (
                    <Card key={t.id} className={`cursor-pointer transition-colors ${selectedTemplate?.id === t.id ? "border-primary" : "hover:border-primary/50"}`} onClick={() => openEditor(t)}>
                      <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{t.name}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{t.subject}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs">{t.category || "general"}</Badge>
                            <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); duplicateTemplate(t); }}><Copy className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={e => { e.stopPropagation(); handleDeleteTemplate(t); }}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Editor Panel */}
              <div className="lg:col-span-2">
                {selectedTemplate ? (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Editing: {form.name}</CardTitle>
                        <Button onClick={saveTemplate}>{t('saveChanges', 'Save Changes')}</Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div><Label>{t("name", "Name")}</Label><Input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} /></div>
                        <div><Label>{t("subject", "Subject")}</Label><Input value={form.subject} onChange={e => setForm(p => ({...p, subject: e.target.value}))} /></div>
                        <div>
                          <Label>{t("category", "Category")}</Label>
                          <Select value={form.category} onValueChange={v => setForm(p => ({...p, category: v}))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Merge Tags */}
                      <div>
                        <Label className="flex items-center gap-1 mb-2"><Tag className="h-3 w-3" />{t('mergeTags', 'Merge Tags')}</Label>
                        <div className="flex flex-wrap gap-1">
                          {MERGE_TAGS.map(({ tag, label }) => (
                            <Button key={tag} size="sm" variant="outline" className="text-xs h-7" onClick={() => insertMergeTag(tag)}>{label}</Button>
                          ))}
                        </div>
                      </div>

                      {/* Edit Mode Toggle */}
                      <Tabs value={editMode} onValueChange={v => setEditMode(v as any)}>
                        <TabsList>
                          <TabsTrigger value="visual"><Eye className="h-3 w-3 mr-1" />{t("visual", "Visual")}</TabsTrigger>
                          <TabsTrigger value="html"><Code className="h-3 w-3 mr-1" />{t('htmlSource', 'HTML Source')}</TabsTrigger>
                        </TabsList>
                        <TabsContent value="visual">
                          <Textarea ref={textareaRef} value={form.body_text || form.body_html} onChange={e => setForm(p => ({...p, body_text: e.target.value, body_html: e.target.value}))} rows={12} placeholder={t('placeholder.writeYourEmailContentHere', 'Write your email content here...')} className="font-sans" />
                        </TabsContent>
                        <TabsContent value="html">
                          <Textarea ref={textareaRef} value={form.body_html} onChange={e => setForm(p => ({...p, body_html: e.target.value}))} rows={12} placeholder={t("htmlhtml", "<html>...</html>")} className="font-mono text-sm" />
                        </TabsContent>
                      </Tabs>

                      {/* CAN-SPAM / GDPR Compliance Note */}
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {t('emailCompliance.canSpamNote', 'CAN-SPAM / GDPR required: All marketing emails are automatically wrapped in the base template which includes a physical mailing address, an unsubscribe/email preferences link, and RFC 8058 List-Unsubscribe headers. Do not remove these elements. Transactional emails (security alerts, password resets) are exempt but must still identify the sender.')}
                        </AlertDescription>
                      </Alert>

                      {/* Preview */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label>{t("preview", "Preview")}</Label>
                          <div className="flex gap-1">
                            <Button size="sm" variant={previewDevice === "desktop" ? "default" : "outline"} onClick={() => setPreviewDevice("desktop")}><Monitor className="h-3 w-3" /></Button>
                            <Button size="sm" variant={previewDevice === "mobile" ? "default" : "outline"} onClick={() => setPreviewDevice("mobile")}><Smartphone className="h-3 w-3" /></Button>
                          </div>
                        </div>
                        <div className={`border rounded-lg p-4 bg-white ${previewDevice === "mobile" ? "max-w-[375px] mx-auto" : ""}`}>
                          <div className="border-b pb-2 mb-3">
                            <p className="text-xs text-muted-foreground">{t('subject', 'Subject:')}</p>
                            <p className="font-medium text-sm">{form.subject}</p>
                          </div>
                          <div className="text-sm prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderPreviewHTML(form.body_html || form.body_text) }} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-24 text-center text-muted-foreground">
                      <Mail className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p>{t('selectATemplateToEdit', 'Select a template to edit, or create a new one.')}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </>
        )}

        <ConfirmDialog />
      </div>
    </RoleGate>
  );
}

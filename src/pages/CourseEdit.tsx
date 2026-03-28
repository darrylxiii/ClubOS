import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link } from "react-router-dom";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { notify } from "@/lib/notify";
import { SectionLoader } from "@/components/ui/unified-loader";
import {
  Loader2,
  ChevronLeft,
  Save,
  Sparkles,
  BookOpen,
  Wand2
} from "lucide-react";
import { CourseBuilder, Module } from "@/components/academy/CourseBuilder";
import { CreateModuleDialog } from "@/components/academy/CreateModuleDialog";

const TITLE_MAX = 100;
const DESC_MAX = 2000;

interface FormErrors {
  title?: string;
  description?: string;
}

export default function CourseEdit() {
  const { t } = useTranslation('common');
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiConfirmPending, setAiConfirmPending] = useState(false);
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isDirty, setIsDirty] = useState(false);
  const initialFormData = useRef<typeof formData | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    difficulty_level: "beginner",
    estimated_hours: "",
    category: "",
    course_image_url: "",
    course_video_url: "",
    visibility: "private",
  });

  // Validate fields on change
  const validateField = useCallback((field: string, value: string): string | undefined => {
    switch (field) {
      case "title":
        if (!value.trim()) return "Title is required";
        if (value.trim().length < 3) return "Title must be at least 3 characters";
        if (value.length > TITLE_MAX) return `Title must be ${TITLE_MAX} characters or fewer`;
        return undefined;
      case "description":
        if (!value.trim()) return "Description is required";
        if (value.trim().length < 10) return "Description must be at least 10 characters";
        if (value.length > DESC_MAX) return `Description must be ${DESC_MAX} characters or fewer`;
        return undefined;
      default:
        return undefined;
    }
  }, []);

  const updateFormField = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === "title" || field === "description") {
      setFormErrors(prev => ({ ...prev, [field]: validateField(field, value) }));
    }
  }, [validateField]);

  // Track dirty state
  useEffect(() => {
    if (!initialFormData.current) return;
    const changed = Object.keys(formData).some(
      key => formData[key as keyof typeof formData] !== initialFormData.current![key as keyof typeof formData]
    );
    setIsDirty(changed);
  }, [formData]);

  // Warn on navigation with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  useEffect(() => {
    loadCourseData();
  }, [id, user]);

  // Auto-calculate estimated hours from module durations
  useEffect(() => {
    if (modules.length === 0) return;
    const totalMinutes = modules.reduce((sum, m) => sum + (m.estimated_minutes || 0), 0);
    if (totalMinutes > 0) {
      const totalHours = Math.round((totalMinutes / 60) * 10) / 10; // round to 1 decimal
      setFormData((prev) => ({ ...prev, estimated_hours: totalHours.toString() }));
    }
  }, [modules]);

  const loadCourseData = async () => {
    if (!id) return;

    try {
      setLoading(true);

      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select(`
          *,
          modules(*)
        `)
        .eq("id", id)
        .single();

      if (courseError) throw courseError;

      // Check if user owns this course
      if (courseData.created_by !== user?.id) {
        notify.error("Access denied", { description: "You don't have permission to edit this course" });
        navigate("/academy/creator");
        return;
      }

      setCourse(courseData);
      setModules(courseData.modules || []);
      const loaded = {
        title: courseData.title || "",
        description: courseData.description || "",
        difficulty_level: courseData.difficulty_level || "beginner",
        estimated_hours: courseData.estimated_hours?.toString() || "",
        category: courseData.category || "",
        course_image_url: courseData.course_image_url || "",
        course_video_url: courseData.course_video_url || "",
        visibility: courseData.visibility || "private",
      };
      setFormData(loaded);
      initialFormData.current = loaded;
      setFormErrors({});
      setIsDirty(false);
    } catch (error: unknown) {
      notify.error("Error loading course", { description: error instanceof Error ? error.message : 'Unknown error' });
      navigate("/academy/creator");
    } finally {
      setLoading(false);
    }
  };

  const enhanceDescription = async () => {
    // Two-click confirmation: first click sets pending, second click executes
    if (!aiConfirmPending) {
      if (!formData.title || !formData.description) {
        notify.error("Missing information", { description: "Please add a title and description first" });
        return;
      }
      setAiConfirmPending(true);
      return;
    }

    setAiConfirmPending(false);
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-course-generator', {
        body: {
          action: 'enhance_description',
          prompt: formData.description,
          courseData: { title: formData.title }
        }
      });

      if (error) throw error;

      updateFormField("description", data.content);
      notify.success("Description enhanced", { description: "AI has improved your course description" });
    } catch (error: unknown) {
      notify.error("Enhancement failed", { description: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setAiLoading(false);
    }
  };



  const handleModulesChange = async (newModules: Module[]) => {
    // Optimistic update
    setModules(newModules);

    try {
      const updates = newModules.map((module, index) => ({
        id: module.id,
        display_order: index,
        updated_at: new Date().toISOString(),
      }));

      const promises = updates.map(update =>
        supabase
          .from('modules')
          .update({ display_order: update.display_order })
          .eq('id', update.id)
      );

      await Promise.all(promises);
    } catch (error: unknown) {
      notify.error("Error reordering modules", { description: error instanceof Error ? error.message : 'Unknown error' });
      loadCourseData();
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm("Are you sure you want to delete this module?")) return;

    try {
      const { error } = await supabase
        .from("modules")
        .delete()
        .eq("id", moduleId);

      if (error) throw error;

      notify.success("Module deleted", { description: "The module has been removed successfully" });

      loadCourseData();
    } catch (error: unknown) {
      notify.error("Error deleting module", { description: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const hasFormErrors = !!(formErrors.title || formErrors.description);
  const isFormValid = formData.title.trim().length >= 3 && formData.description.trim().length >= 10 && !hasFormErrors;

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user || !id) return;

    // Run full validation
    const titleErr = validateField("title", formData.title);
    const descErr = validateField("description", formData.description);
    if (titleErr || descErr) {
      setFormErrors({ title: titleErr, description: descErr });
      notify.error("Validation errors", { description: "Please fix the highlighted fields" });
      return;
    }

    setSaving(true);
    try {
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const { error } = await supabase
        .from("courses")
        .update({
          title: formData.title,
          slug,
          description: formData.description,
          difficulty_level: formData.difficulty_level,
          estimated_hours: formData.estimated_hours ? parseInt(formData.estimated_hours) : null,
          category: formData.category || null,
          course_image_url: formData.course_image_url || null,
          course_video_url: formData.course_video_url || null,
          visibility: formData.visibility || "private",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("created_by", user.id);

      if (error) throw error;

      notify.success("Course updated", { description: "Your changes have been saved successfully" });
      setIsDirty(false);

      // Reload the course data to show updated values
      await loadCourseData();
    } catch (error: unknown) {
      notify.error("Error saving course", { description: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[60vh]">
          <SectionLoader />
        </div>
      </>
    );
  }

  if (!course) {
    return (
      <>
        <div className="container max-w-6xl mx-auto p-6 text-center py-12">
          <h2 className="text-2xl font-bold mb-4">{t('courseEdit.text6')}</h2>
          <Link to="/academy/creator">
            <Button>{t('courseEdit.text7')}</Button>
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="container max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/courses/${course.slug}`)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Course
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/academy/creator")}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving || !isFormValid || !isDirty}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t('courseEdit.text8')}</h1>
              <p className="text-sm text-muted-foreground">{t('courseEdit.desc')}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="rounded-2xl mb-6">
                <TabsTrigger value="basic">{t('courseEdit.text9')}</TabsTrigger>
                <TabsTrigger value="details">{t('courseEdit.text10')}</TabsTrigger>
                <TabsTrigger value="media">{t('courseEdit.text11')}</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">{"Course Title *"}</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => updateFormField("title", e.target.value)}
                    placeholder={"e.g., Advanced Leadership Skills"}
                    maxLength={TITLE_MAX}
                    required
                    className={formErrors.title ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                  <div className="flex items-center justify-between">
                    {formErrors.title ? (
                      <p className="text-xs text-red-500">{formErrors.title}</p>
                    ) : <span />}
                    <p className="text-xs text-muted-foreground">{formData.title.length}/{TITLE_MAX}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="description">{t('courseEdit.text12')}</Label>
                    <Button
                      type="button"
                      variant={aiConfirmPending ? "destructive" : "ghost"}
                      size="sm"
                      onClick={enhanceDescription}
                      onBlur={() => setAiConfirmPending(false)}
                      disabled={aiLoading || !formData.description}
                    >
                      {aiLoading ? (
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      ) : (
                        <Wand2 className="mr-2 h-3 w-3" />
                      )}
                      {aiConfirmPending ? "Replace description with AI version?" : "Enhance with AI"}
                    </Button>
                  </div>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => updateFormField("description", e.target.value)}
                    placeholder={t('courseEdit.text13')}
                    maxLength={DESC_MAX}
                    rows={6}
                    className={formErrors.description ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                  <div className="flex items-center justify-between">
                    {formErrors.description ? (
                      <p className="text-xs text-red-500">{formErrors.description}</p>
                    ) : <span />}
                    <p className="text-xs text-muted-foreground">{formData.description.length}/{DESC_MAX}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">{t('courseEdit.text14')}</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    placeholder={"e.g., Leadership, Technology, Sales"}
                  />
                </div>
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="difficulty">{t('courseEdit.text15')}</Label>
                  <Select
                    value={formData.difficulty_level}
                    onValueChange={(value) =>
                      setFormData({ ...formData, difficulty_level: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">{t('courseEdit.text16')}</SelectItem>
                      <SelectItem value="intermediate">{t('courseEdit.text17')}</SelectItem>
                      <SelectItem value="advanced">{t('courseEdit.text18')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('common:visibility', 'Visibility')}</Label>
                  <Select
                    value={formData.visibility}
                    onValueChange={(value) => {
                      if (value === "public" && formData.visibility !== "public") {
                        if (!window.confirm("Are you sure you want to make this course public? Anyone will be able to view it.")) return;
                      }
                      setFormData({ ...formData, visibility: value });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private — Members only</SelectItem>
                      <SelectItem value="unlisted">Unlisted — Anyone with share link</SelectItem>
                      <SelectItem value="public">Public — Anyone can view</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Controls who can access this course outside the platform
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hours">{t('courseEdit.text19')}</Label>
                  <Input
                    id="hours"
                    type="number"
                    min="0"
                    value={formData.estimated_hours}
                    onChange={(e) =>
                      setFormData({ ...formData, estimated_hours: e.target.value })
                    }
                    placeholder={"e.g., 8"}
                  />
                  <p className="text-xs text-muted-foreground">{t('courseEdit.desc2')}</p>
                </div>
              </TabsContent>

              <TabsContent value="media" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="image">{t('courseEdit.text20')}</Label>
                  <Input
                    id="image"
                    value={formData.course_image_url}
                    onChange={(e) =>
                      setFormData({ ...formData, course_image_url: e.target.value })
                    }
                    placeholder="https://example.com/image.jpg"
                  />
                  <p className="text-xs text-muted-foreground">{t('courseEdit.desc3')}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="video">{t('courseEdit.text21')}</Label>
                  <Input
                    id="video"
                    value={formData.course_video_url}
                    onChange={(e) =>
                      setFormData({ ...formData, course_video_url: e.target.value })
                    }
                    placeholder="https://youtube.com/watch?v=..."
                  />
                  <p className="text-xs text-muted-foreground">{t('courseEdit.desc4')}</p>
                </div>
              </TabsContent>
            </Tabs>
          </form>
        </Card>

        {/* Modules Section */}

        <Card className="p-6">
          <div className="mb-6">
            <h3 className="font-bold text-lg">{t('courseEdit.text22')}</h3>
            <p className="text-sm text-muted-foreground">{t('courseEdit.desc5')}</p>
          </div>

          <CourseBuilder
            modules={modules}
            onModulesChange={handleModulesChange}
            onEditModule={(id) => navigate(`/modules/${id}/edit`)}
            onDeleteModule={handleDeleteModule}
            onAddModule={() => setShowCreateDialog(true)}
          />
        </Card>

        <CreateModuleDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          courseId={id!}
          onSuccess={loadCourseData}
          nextDisplayOrder={modules.length}
        />
      </div>
    </>
  );
}

import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
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

export default function CourseEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    difficulty_level: "beginner",
    estimated_hours: "",
    category: "",
    course_image_url: "",
    course_video_url: "",
  });

  useEffect(() => {
    loadCourseData();
  }, [id, user]);

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
      setFormData({
        title: courseData.title || "",
        description: courseData.description || "",
        difficulty_level: courseData.difficulty_level || "beginner",
        estimated_hours: courseData.estimated_hours?.toString() || "",
        category: courseData.category || "",
        course_image_url: courseData.course_image_url || "",
        course_video_url: courseData.course_video_url || "",
      });
    } catch (error: unknown) {
      notify.error("Error loading course", { description: error instanceof Error ? error.message : 'Unknown error' });
      navigate("/academy/creator");
    } finally {
      setLoading(false);
    }
  };

  const enhanceDescription = async () => {
    if (!formData.title || !formData.description) {
      notify.error("Missing information", { description: "Please add a title and description first" });
      return;
    }

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

      setFormData({ ...formData, description: data.content });
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

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user || !id) return;

    if (!formData.title.trim()) {
      notify.error("Title required", { description: "Please enter a course title" });
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
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("created_by", user.id);

      if (error) throw error;

      notify.success("Course updated", { description: "Your changes have been saved successfully" });

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
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <SectionLoader />
        </div>
      </AppLayout>
    );
  }

  if (!course) {
    return (
      <AppLayout>
        <div className="container max-w-6xl mx-auto p-6 text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Course not found</h2>
          <Link to="/academy/creator">
            <Button>Back to Creator Hub</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
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
            <Button onClick={handleSubmit} disabled={saving}>
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
            <div className="p-2 squircle-sm bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Edit Course</h1>
              <p className="text-sm text-muted-foreground">
                Update your course details and settings
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="squircle mb-6">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="media">Media</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Course Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="e.g., Advanced Leadership Skills"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="description">Description</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={enhanceDescription}
                      disabled={aiLoading || !formData.description}
                    >
                      {aiLoading ? (
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      ) : (
                        <Wand2 className="mr-2 h-3 w-3" />
                      )}
                      Enhance with AI
                    </Button>
                  </div>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Describe what students will learn in this course..."
                    rows={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    placeholder="e.g., Leadership, Technology, Sales"
                  />
                </div>
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty Level</Label>
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
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hours">Estimated Hours</Label>
                  <Input
                    id="hours"
                    type="number"
                    min="0"
                    value={formData.estimated_hours}
                    onChange={(e) =>
                      setFormData({ ...formData, estimated_hours: e.target.value })
                    }
                    placeholder="e.g., 8"
                  />
                  <p className="text-xs text-muted-foreground">
                    Approximate time to complete the course
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="media" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="image">Course Image URL</Label>
                  <Input
                    id="image"
                    value={formData.course_image_url}
                    onChange={(e) =>
                      setFormData({ ...formData, course_image_url: e.target.value })
                    }
                    placeholder="https://example.com/image.jpg"
                  />
                  <p className="text-xs text-muted-foreground">
                    Featured image for the course (optional)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="video">Course Preview Video URL</Label>
                  <Input
                    id="video"
                    value={formData.course_video_url}
                    onChange={(e) =>
                      setFormData({ ...formData, course_video_url: e.target.value })
                    }
                    placeholder="https://youtube.com/watch?v=..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional preview video for the course
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </form>
        </Card>

        {/* Modules Section */}

        <Card className="p-6">
          <div className="mb-6">
            <h3 className="font-bold text-lg">Course Modules</h3>
            <p className="text-sm text-muted-foreground">
              Manage your course content. Drag to reorder.
            </p>
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
    </AppLayout>
  );
}

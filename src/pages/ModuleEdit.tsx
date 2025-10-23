import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, Save, BookOpen } from "lucide-react";

export default function ModuleEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [module, setModule] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    estimated_minutes: "",
  });

  useEffect(() => {
    loadModuleData();
  }, [id, user]);

  const loadModuleData = async () => {
    if (!id) return;

    try {
      setLoading(true);

      const { data: moduleData, error } = await supabase
        .from("modules")
        .select("*, courses!inner(*)")
        .eq("id", id)
        .single();

      if (error) throw error;

      // Check if user owns this module's course
      if (moduleData.courses.created_by !== user?.id) {
        toast({
          title: "Access denied",
          description: "You don't have permission to edit this module",
          variant: "destructive",
        });
        navigate("/academy/creator");
        return;
      }

      setModule(moduleData);
      setFormData({
        title: moduleData.title || "",
        description: moduleData.description || "",
        estimated_minutes: moduleData.estimated_minutes?.toString() || "",
      });
    } catch (error: any) {
      toast({
        title: "Error loading module",
        description: error.message,
        variant: "destructive",
      });
      navigate("/academy/creator");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user || !id) return;

    if (!formData.title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a module title",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const { error } = await supabase
        .from("modules")
        .update({
          title: formData.title,
          slug,
          description: formData.description,
          estimated_minutes: formData.estimated_minutes
            ? parseInt(formData.estimated_minutes)
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Module updated",
        description: "Your changes have been saved successfully",
      });

      await loadModuleData();
    } catch (error: any) {
      toast({
        title: "Error saving module",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!module) {
    return (
      <AppLayout>
        <div className="container max-w-6xl mx-auto p-6 text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Module not found</h2>
          <Button onClick={() => navigate("/academy/creator")}>
            Back to Creator Hub
          </Button>
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
              onClick={() => navigate(`/courses/manage-modules/${module.course_id}`)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Modules
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/courses/manage-modules/${module.course_id}`)}
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
              <h1 className="text-2xl font-bold">Edit Module</h1>
              <p className="text-sm text-muted-foreground">
                Update your module details
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Module Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="e.g., Introduction to React Hooks"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="What will students learn in this module?"
                rows={6}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimated_minutes">Estimated Time (minutes)</Label>
              <Input
                id="estimated_minutes"
                type="number"
                min="1"
                value={formData.estimated_minutes}
                onChange={(e) =>
                  setFormData({ ...formData, estimated_minutes: e.target.value })
                }
                placeholder="e.g., 45"
              />
              <p className="text-xs text-muted-foreground">
                Approximate time to complete the module
              </p>
            </div>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}

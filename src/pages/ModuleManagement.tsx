import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CreateModuleDialog } from "@/components/academy/CreateModuleDialog";
import {
  Loader2,
  ChevronLeft,
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  BookOpen
} from "lucide-react";
import { CourseBuilder, Module } from "@/components/academy/CourseBuilder";

export default function ModuleManagement() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, [id, user]);

  const loadData = async () => {
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
        toast({
          title: "Access denied",
          description: "You don't have permission to manage these modules",
          variant: "destructive",
        });
        navigate("/academy/creator");
        return;
      }

      setCourse(courseData);
      setModules((courseData.modules || []).sort((a: any, b: any) => a.display_order - b.display_order));
    } catch (error: any) {
      toast({
        title: "Error loading modules",
        description: error.message,
        variant: "destructive",
      });
      navigate("/academy/creator");
    } finally {
      setLoading(false);
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

      toast({
        title: "Module deleted",
        description: "The module has been removed successfully",
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Error deleting module",
        description: error.message,
        variant: "destructive",
      });
    }
  };



  const handleModulesChange = async (newModules: Module[]) => {
    // Optimistic update
    setModules(newModules);

    try {
      // Prepare updates for all affected modules
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

    } catch (error: any) {
      toast({
        title: "Error reordering modules",
        description: error.message,
        variant: "destructive",
      });
      // Revert to original order (reload data)
      loadData();
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
              onClick={() => navigate(`/academy/courses/${id}/edit`)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Course
            </Button>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Module
          </Button>
        </div>

        {/* Course Info */}
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 squircle-sm bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{course.title}</h1>
              <p className="text-sm text-muted-foreground">
                Manage modules for this course
              </p>
            </div>
          </div>
        </Card>

        {/* Modules List */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="font-bold text-lg">Course Modules</h3>
            <p className="text-sm text-muted-foreground">
              {modules.length} module{modules.length !== 1 ? "s" : ""} in this course
            </p>
          </div>

          {modules.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No modules yet</p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Module
              </Button>
            </div>
          ) : (
            <CourseBuilder
              modules={modules}
              onModulesChange={handleModulesChange}
              onEditModule={(id) => navigate(`/modules/${id}/edit`)}
              onDeleteModule={handleDeleteModule}
              onAddModule={() => setShowCreateDialog(true)}
            />
          )}
        </Card>
      </div>

      <CreateModuleDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        courseId={id!}
        onSuccess={loadData}
        nextDisplayOrder={modules.length}
      />
    </AppLayout>
  );
}

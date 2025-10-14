import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CreateModuleDialog } from "@/components/academy/CreateModuleDialog";
import { 
  BookOpen, 
  Clock, 
  ArrowLeft,
  PlayCircle,
  CheckCircle2,
  Lock,
  GraduationCap,
  Edit,
  Eye,
  EyeOff,
  Plus,
  Loader2
} from "lucide-react";

export default function CourseDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showCreateModule, setShowCreateModule] = useState(false);

  useEffect(() => {
    loadCourseData();
  }, [slug, user]);

  const loadCourseData = async () => {
    try {
      setLoading(true);

      // Load course
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select(`
          *,
          profiles:created_by(full_name, avatar_url)
        `)
        .eq("slug", slug)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);
      setIsOwner(user?.id === courseData.created_by);

      // Load modules
      const { data: modulesData } = await supabase
        .from("modules")
        .select("*")
        .eq("course_id", courseData.id)
        .order("display_order");

      setModules(modulesData || []);
    } catch (error: any) {
      toast({
        title: "Error loading course",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePublishToggle = async () => {
    if (!course) return;

    setPublishing(true);
    try {
      const { error } = await supabase
        .from("courses")
        .update({ is_published: !course.is_published })
        .eq("id", course.id);

      if (error) throw error;

      toast({
        title: course.is_published ? "Course unpublished" : "Course published",
        description: course.is_published 
          ? "Course is now hidden from students" 
          : "Course is now visible to students",
      });

      setCourse({ ...course, is_published: !course.is_published });
    } catch (error: any) {
      toast({
        title: "Error updating course",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setPublishing(false);
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
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold">Course not found</h2>
          <Link to="/academy">
            <Button className="mt-4">Back to Academy</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-6xl mx-auto p-6 space-y-8">
        {/* Back Button */}
        <Link to="/academy">
          <Button variant="ghost" className="squircle-sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Academy
          </Button>
        </Link>

        {/* Course Header */}
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="squircle-sm">
                  {course.difficulty_level}
                </Badge>
                {!course.is_published && (
                  <Badge variant="secondary" className="squircle-sm">
                    <EyeOff className="mr-1 h-3 w-3" />
                    Unpublished
                  </Badge>
                )}
              </div>
              <h1 className="text-4xl font-bold">{course.title}</h1>
              <p className="text-lg text-muted-foreground">{course.description}</p>
              
              <div className="flex items-center gap-6 text-sm text-muted-foreground pt-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span>{modules.length} Modules</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{course.estimated_hours || 0} Hours</span>
                </div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  <span>By {course.profiles?.full_name || "Unknown"}</span>
                </div>
              </div>
            </div>

            {isOwner && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handlePublishToggle}
                  disabled={publishing}
                >
                  {publishing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : course.is_published ? (
                    <EyeOff className="mr-2 h-4 w-4" />
                  ) : (
                    <Eye className="mr-2 h-4 w-4" />
                  )}
                  {course.is_published ? "Unpublish" : "Publish"}
                </Button>
                <Button variant="outline">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Course
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Modules List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Course Modules</h2>
            {isOwner && modules.length > 0 && (
              <Button onClick={() => setShowCreateModule(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Module
              </Button>
            )}
          </div>
          
          {modules.length === 0 ? (
            <Card className="p-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No modules yet</h3>
              <p className="text-muted-foreground mb-4">
                {isOwner 
                  ? "Add modules to this course to get started"
                  : "This course doesn't have any modules yet"}
              </p>
              {isOwner && (
                <Button onClick={() => setShowCreateModule(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Module
                </Button>
              )}
            </Card>
          ) : (
            <div className="space-y-3">
              {modules.map((module, index) => (
                <Link key={module.id} to={`/academy/modules/${module.slug}`}>
                  <Card className="p-6 hover-lift transition-all">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{module.title}</h3>
                          {!module.is_published && (
                            <Badge variant="secondary" className="squircle-sm text-xs">
                              <EyeOff className="mr-1 h-3 w-3" />
                              Draft
                            </Badge>
                          )}
                        </div>
                        {module.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {module.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                          {module.estimated_minutes && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{module.estimated_minutes} min</span>
                            </div>
                          )}
                          {module.video_url && (
                            <div className="flex items-center gap-1">
                              <PlayCircle className="h-3 w-3" />
                              <span>Video</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {module.is_published ? (
                          <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <Lock className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Create Module Dialog */}
        {isOwner && course && (
          <CreateModuleDialog
            open={showCreateModule}
            onOpenChange={setShowCreateModule}
            courseId={course.id}
            onSuccess={loadCourseData}
            nextDisplayOrder={modules.length + 1}
          />
        )}
      </div>
    </AppLayout>
  );
}

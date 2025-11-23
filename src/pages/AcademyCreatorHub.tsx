import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  GraduationCap,
  BookOpen,
  Users,
  TrendingUp,
  Plus,
  Edit,
  Eye,
  EyeOff,
  BarChart3,
  Award,
  Clock,
  Loader2,
  Sparkles
} from "lucide-react";
import { CreateCourseDialog } from "@/components/academy/CreateCourseDialog";
import { GenerateCourseDialog } from "@/components/academy/GenerateCourseDialog";

export default function AcademyCreatorHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [courses, setCourses] = useState<any[]>([]);
  const [academy, setAcademy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [stats, setStats] = useState({
    totalCourses: 0,
    publishedCourses: 0,
    totalModules: 0,
    totalStudents: 0,
  });

  useEffect(() => {
    loadCreatorData();
  }, [user]);

  const loadCreatorData = async () => {
    try {
      setLoading(true);

      // Load default academy
      const { data: academyData } = await supabase
        .from("academies")
        .select("*")
        .eq("slug", "quantum-club-academy")
        .single();

      setAcademy(academyData);

      // Load creator's courses
      const { data: coursesData } = await supabase
        .from("courses")
        .select(`
          *,
          modules:modules(count)
        `)
        .eq("created_by", user?.id)
        .order("created_at", { ascending: false });

      setCourses(coursesData || []);

      // Calculate stats
      const totalCourses = coursesData?.length || 0;
      const publishedCourses = coursesData?.filter(c => c.is_published).length || 0;
      const totalModules = coursesData?.reduce((sum, c) => sum + (c.modules?.[0]?.count || 0), 0) || 0;

      setStats({
        totalCourses,
        publishedCourses,
        totalModules,
        totalStudents: 0, // Enrollment tracking will be implemented in Phase 2
      });

    } catch (error: any) {
      toast({
        title: "Error loading creator data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePublishToggle = async (courseId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("courses")
        .update({ is_published: !currentStatus })
        .eq("id", courseId);

      if (error) throw error;

      toast({
        title: currentStatus ? "Course unpublished" : "Course published",
        description: currentStatus
          ? "Course is now hidden from students"
          : "Course is now visible to students",
      });

      loadCreatorData();
    } catch (error: any) {
      toast({
        title: "Error updating course",
        description: error.message,
        variant: "destructive",
      });
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

  return (
    <AppLayout>
      <div className="container max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 squircle bg-primary/10">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Creator Hub</h1>
              <p className="text-muted-foreground">Manage your courses and track your impact</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowGenerateDialog(true)}
              className="squircle border-primary/20 hover:bg-primary/5"
            >
              <Sparkles className="mr-2 h-4 w-4 text-primary" />
              Generate with AI
            </Button>
            <Button onClick={() => setShowCreateCourse(true)} className="squircle">
              <Plus className="mr-2 h-4 w-4" />
              Create New Course
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6 squircle">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Courses</p>
                <p className="text-3xl font-bold mt-2">{stats.totalCourses}</p>
              </div>
              <div className="p-3 squircle-sm bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="p-6 squircle">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Published</p>
                <p className="text-3xl font-bold mt-2">{stats.publishedCourses}</p>
              </div>
              <div className="p-3 squircle-sm bg-green-500/10">
                <Eye className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </Card>

          <Card className="p-6 squircle">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Modules</p>
                <p className="text-3xl font-bold mt-2">{stats.totalModules}</p>
              </div>
              <div className="p-3 squircle-sm bg-blue-500/10">
                <Award className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </Card>

          <Card className="p-6 squircle">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-3xl font-bold mt-2">{stats.totalStudents}</p>
              </div>
              <div className="p-3 squircle-sm bg-purple-500/10">
                <Users className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="courses" className="space-y-6">
          <TabsList className="squircle">
            <TabsTrigger value="courses">My Courses</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="space-y-4">
            {courses.length === 0 ? (
              <Card className="p-12 text-center squircle">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No courses yet</h3>
                <p className="text-muted-foreground mb-6">
                  Create your first course and start sharing your knowledge
                </p>
                <Button onClick={() => setShowCreateCourse(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Course
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <Card key={course.id} className="squircle overflow-hidden hover-lift transition-all">
                    {/* Course Header */}
                    <div className="h-32 bg-gradient-to-br from-purple-300 via-pink-300 to-purple-400 p-4 flex items-center justify-center relative">
                      <BookOpen className="h-16 w-16 text-white/60" />
                      <div className="absolute top-3 right-3 flex gap-2">
                        {course.is_published ? (
                          <Badge className="squircle-sm bg-green-500">
                            <Eye className="mr-1 h-3 w-3" />
                            Published
                          </Badge>
                        ) : (
                          <Badge className="squircle-sm bg-yellow-500">
                            <EyeOff className="mr-1 h-3 w-3" />
                            Draft
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-3">
                      <div>
                        <h3 className="font-bold line-clamp-2 min-h-[3rem]">
                          {course.title}
                        </h3>
                        {course.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                            {course.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4" />
                          <span>{course.modules?.[0]?.count || 0} modules</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{course.estimated_hours || 0}h</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 squircle-sm"
                          onClick={() => navigate(`/courses/${course.slug}`)}
                        >
                          <Edit className="mr-1 h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          variant={course.is_published ? "outline" : "default"}
                          size="sm"
                          className="flex-1 squircle-sm"
                          onClick={() => handlePublishToggle(course.id, course.is_published)}
                        >
                          {course.is_published ? (
                            <>
                              <EyeOff className="mr-1 h-3 w-3" />
                              Unpublish
                            </>
                          ) : (
                            <>
                              <Eye className="mr-1 h-3 w-3" />
                              Publish
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card className="p-12 text-center squircle">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Analytics Coming Soon</h3>
              <p className="text-muted-foreground">
                Track student engagement, course completion rates, and more
              </p>
            </Card>
          </TabsContent>
        </Tabs>

        <CreateCourseDialog
          open={showCreateCourse}
          onOpenChange={setShowCreateCourse}
          academyId={academy?.id}
          onSuccess={loadCreatorData}
        />

        <GenerateCourseDialog
          open={showGenerateDialog}
          onOpenChange={setShowGenerateDialog}
          academyId={academy?.id}
          onSuccess={loadCreatorData}
        />
      </div>
    </AppLayout>
  );
}

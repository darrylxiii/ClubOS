import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  GraduationCap, 
  BookOpen, 
  Clock, 
  Users, 
  Star,
  Plus,
  TrendingUp,
  Award,
  Target
} from "lucide-react";
import { CreateCourseDialog } from "@/components/academy/CreateCourseDialog";
import { CourseCard } from "@/components/academy/CourseCard";
import { LearningPathCard } from "@/components/academy/LearningPathCard";

export default function Academy() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [academy, setAcademy] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [learningPaths, setLearningPaths] = useState<any[]>([]);
  const [isExpert, setIsExpert] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCreateCourse, setShowCreateCourse] = useState(false);

  useEffect(() => {
    loadAcademyData();
  }, [slug, user]);

  const loadAcademyData = async () => {
    try {
      setLoading(true);

      // Load academy
      const { data: academyData, error: academyError } = await supabase
        .from("academies")
        .select("*")
        .eq("slug", slug || "quantum-club-academy")
        .single();

      if (academyError) throw academyError;
      setAcademy(academyData);

      // Load courses
      const { data: coursesData } = await supabase
        .from("courses")
        .select(`
          *,
          profiles:created_by(full_name, avatar_url)
        `)
        .eq("academy_id", academyData.id)
        .eq("is_published", true)
        .order("display_order");

      setCourses(coursesData || []);

      // Load learning paths
      const { data: pathsData } = await supabase
        .from("learning_paths")
        .select("*")
        .eq("academy_id", academyData.id)
        .eq("is_active", true)
        .order("display_order");

      setLearningPaths(pathsData || []);

      // Check if user is an expert
      if (user) {
        const { data: expertData } = await supabase
          .from("expert_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        setIsExpert(!!expertData);
      }
    } catch (error: any) {
      toast({
        title: "Error loading academy",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-pulse text-muted-foreground">Loading academy...</div>
        </div>
      </AppLayout>
    );
  }

  if (!academy) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-4xl font-bold mb-4">Academy Not Found</h1>
          <Link to="/home">
            <Button>Return Home</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-hero py-20">
          <div className="absolute inset-0 bg-gradient-mesh opacity-30" />
          <div className="container relative mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center text-white">
              <div className="mb-6 flex justify-center">
                <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md">
                  <GraduationCap className="h-12 w-12" />
                </div>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
                {academy.name}
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-white/90">
                {academy.tagline}
              </p>
              <p className="text-lg text-white/80 max-w-2xl mx-auto">
                {academy.description}
              </p>
              
              {isExpert && (
                <div className="mt-8">
                  <Button 
                    size="lg" 
                    onClick={() => setShowCreateCourse(true)}
                    className="squircle-lg"
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Create Course
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="border-b">
          <div className="container mx-auto px-4 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{courses.length}</p>
                  <p className="text-sm text-muted-foreground">Courses</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-accent/10">
                  <Target className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{learningPaths.length}</p>
                  <p className="text-sm text-muted-foreground">Learning Paths</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-success/10">
                  <Users className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">1.2K+</p>
                  <p className="text-sm text-muted-foreground">Active Learners</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-warning/10">
                  <Award className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">95%</p>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-12">
          <Tabs defaultValue="courses" className="space-y-8">
            <TabsList className="squircle">
              <TabsTrigger value="courses">All Courses</TabsTrigger>
              <TabsTrigger value="paths">Learning Paths</TabsTrigger>
              <TabsTrigger value="continue">Continue Learning</TabsTrigger>
            </TabsList>

            <TabsContent value="courses" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold">Explore Courses</h2>
                  <p className="text-muted-foreground mt-1">
                    Master new skills with expert-led courses
                  </p>
                </div>
              </div>

              {courses.length === 0 ? (
                <Card className="p-12 text-center squircle">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No courses yet</h3>
                  <p className="text-muted-foreground mb-6">
                    {isExpert 
                      ? "Be the first to create a course for this academy!"
                      : "Check back soon for new courses"}
                  </p>
                  {isExpert && (
                    <Button onClick={() => setShowCreateCourse(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create First Course
                    </Button>
                  )}
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courses.map((course) => (
                    <CourseCard key={course.id} course={course} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="paths" className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold">Learning Paths</h2>
                <p className="text-muted-foreground mt-1">
                  Structured journeys to master specific skills
                </p>
              </div>

              {learningPaths.length === 0 ? (
                <Card className="p-12 text-center squircle">
                  <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No learning paths yet</h3>
                  <p className="text-muted-foreground">
                    Learning paths will be available soon
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {learningPaths.map((path) => (
                    <LearningPathCard key={path.id} path={path} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="continue" className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold">Continue Learning</h2>
                <p className="text-muted-foreground mt-1">
                  Pick up where you left off
                </p>
              </div>

              <Card className="p-12 text-center squircle">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No courses in progress</h3>
                <p className="text-muted-foreground mb-6">
                  Start a course to track your progress
                </p>
                <Link to="#courses">
                  <Button>Browse Courses</Button>
                </Link>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <CreateCourseDialog
          open={showCreateCourse}
          onOpenChange={setShowCreateCourse}
          academyId={academy?.id}
          onSuccess={loadAcademyData}
        />
      </div>
    </AppLayout>
  );
}

import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  GraduationCap, 
  BookOpen, 
  Clock, 
  CheckCircle2,
  Award,
  Target,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  PlayCircle
} from "lucide-react";
import { CreateCourseDialog } from "@/components/academy/CreateCourseDialog";
import { AcademyDashboard } from "@/components/academy/AcademyDashboard";
import { ContinueLearningCard } from "@/components/academy/ContinueLearningCard";
import { MaterialCard } from "@/components/academy/MaterialCard";
import { PopularCourseCard } from "@/components/academy/PopularCourseCard";
import { LearnerDashboard } from "@/components/academy/LearnerDashboard";
import { RecommendationsPanel } from "@/components/academy/RecommendationsPanel";
import { BadgesDisplay } from "@/components/academy/BadgesDisplay";

export default function Academy() {
  const { slug } = useParams();
  const navigate = useNavigate();
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

      // Load courses - show published courses + user's own unpublished courses
      let coursesQuery = supabase
        .from("courses")
        .select(`
          *,
          profiles:created_by(full_name, avatar_url)
        `)
        .eq("academy_id", academyData.id)
        .order("display_order");

      // If user is logged in, also show their unpublished courses
      if (user) {
        const { data: coursesData } = await coursesQuery.or(`is_published.eq.true,created_by.eq.${user.id}`);
        setCourses(coursesData || []);
      } else {
        const { data: coursesData } = await coursesQuery.eq("is_published", true);
        setCourses(coursesData || []);
      }

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
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <Tabs defaultValue="dashboard" className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 squircle bg-primary/10">
                  <GraduationCap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">{academy?.name || "The Quantum Club Academy"}</h1>
                  <p className="text-muted-foreground">{academy?.tagline || "Master your craft with expert-led courses"}</p>
                </div>
              </div>
              {isExpert && (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate("/academy/creator")} 
                    className="squircle"
                  >
                    <GraduationCap className="mr-2 h-4 w-4" />
                    Creator Hub
                  </Button>
                  <Button onClick={() => setShowCreateCourse(true)} className="squircle">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Course
                  </Button>
                </div>
              )}
            </div>

            <TabsList className="squircle">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="my-courses">My Courses</TabsTrigger>
              <TabsTrigger value="explore">Explore</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <LearnerDashboard />
                </div>
                <div className="space-y-6">
                  <RecommendationsPanel />
                </div>
              </div>

              {/* Popular Courses */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Popular Courses</h2>
                  <Button variant="ghost" className="squircle-sm">View All</Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {courses.slice(0, 3).map((course) => (
                    <PopularCourseCard key={course.id} course={course} />
                  ))}
                </div>
              </div>

              {/* Continue Learning */}
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Continue Learning</h2>
                <div className="space-y-4">
                  <ContinueLearningCard
                    title="Creating Engaging Learning Journeys: UI/UX Best Practices"
                    progress={80}
                    materials={12}
                    category="Course"
                    illustration="design"
                    nextLesson="Advance your learning with Mastering UI Design for Impactful Solutions"
                  />
                  <ContinueLearningCard
                    title="The Art of Blending Aesthetics and Functionality in UI/UX Design"
                    progress={30}
                    materials={12}
                    category="Course"
                    illustration="blend"
                    nextLesson="Next, you can dive into Advanced techniques commonly used in UI/UX Design"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="my-courses" className="space-y-6">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">All Materials</h2>
                
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex gap-2">
                    <Button variant="secondary" className="squircle-sm">All Status</Button>
                    <Button variant="ghost" className="squircle-sm">Not Started</Button>
                    <Button variant="ghost" className="squircle-sm">In Progress</Button>
                    <Button variant="ghost" className="squircle-sm">Completed</Button>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search..." className="pl-9 squircle-sm" />
                    </div>
                    <Button variant="outline" className="squircle-sm">
                      <Filter className="mr-2 h-4 w-4" />
                      Add Filter
                    </Button>
                    <Button variant="outline" className="squircle-sm">
                      <ArrowUpDown className="mr-2 h-4 w-4" />
                      Sort by
                    </Button>
                  </div>
                </div>

                {/* Materials Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {courses.length === 0 ? (
                    <Card className="p-12 text-center squircle col-span-full">
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
                    courses.map((course) => (
                      <Link key={course.id} to={`/courses/${course.slug}`}>
                        <Card className="squircle overflow-hidden hover-lift h-full transition-all cursor-pointer">
                          {/* Course illustration header */}
                          <div className="h-48 bg-gradient-to-br from-purple-300 via-pink-300 to-purple-400 p-6 flex items-center justify-center relative overflow-hidden">
                            <Badge className="absolute top-4 right-4 squircle-sm bg-background/90 backdrop-blur-sm text-foreground font-bold">
                              {course.estimated_hours || 12} Hours
                            </Badge>
                            <BookOpen className="h-24 w-24 text-white/60" />
                            {!course.is_published && (
                              <Badge className="absolute top-4 left-4 squircle-sm bg-yellow-500/90 backdrop-blur-sm text-background">
                                Draft
                              </Badge>
                            )}
                          </div>

                          {/* Content */}
                          <div className="p-4 space-y-3 bg-card">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="squircle-sm text-xs text-primary border-primary">
                                Course
                              </Badge>
                              {course.difficulty_level && (
                                <Badge variant="secondary" className="squircle-sm text-xs">
                                  {course.difficulty_level}
                                </Badge>
                              )}
                            </div>

                            <h3 className="font-bold line-clamp-2 min-h-[3rem] text-foreground">
                              {course.title}
                            </h3>

                            {course.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {course.description}
                              </p>
                            )}

                            <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t border-border">
                              <div className="flex items-center gap-1">
                                <PlayCircle className="h-4 w-4" />
                                <span>Start</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>{course.estimated_hours || 0}h</span>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="explore" className="space-y-6">
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
                    <PopularCourseCard key={course.id} course={course} />
                  ))}
                </div>
              )}
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

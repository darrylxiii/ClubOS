import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  PlayCircle,
  Star,
  Users,
  Share2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Loader2 } from "lucide-react";

interface Module {
  id: string;
  title: string;
  description: string;
  estimated_minutes: number;
  display_order: number;
  video_url?: string;
  is_published: boolean;
  course: {
    id: string;
    title: string;
    slug: string;
    difficulty_level: string;
    estimated_hours: number;
    profiles?: {
      full_name: string;
      avatar_url?: string;
    };
  };
}

interface CourseModule {
  id: string;
  title: string;
  slug: string;
  estimated_minutes: number;
  is_published: boolean;
}

export default function ModuleDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [module, setModule] = useState<Module | null>(null);
  const [courseModules, setCourseModules] = useState<CourseModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);

  useEffect(() => {
    fetchModule();
  }, [slug]);

  const fetchModule = async () => {
    if (!slug) return;

    try {
      setLoading(true);
      
      const { data: moduleData, error: moduleError } = await supabase
        .from('modules')
        .select(`
          *,
          course:courses(
            id,
            title,
            slug,
            difficulty_level,
            estimated_hours,
            profiles:created_by(full_name, avatar_url)
          )
        `)
        .eq('slug', slug)
        .single();

      if (moduleError) throw moduleError;
      setModule(moduleData as Module);

      // Fetch all modules in this course
      if (moduleData.course) {
        const { data: modulesData } = await supabase
          .from('modules')
          .select('id, title, slug, estimated_minutes, is_published')
          .eq('course_id', moduleData.course.id)
          .order('display_order');

        if (modulesData) {
          setCourseModules(modulesData);
          const index = modulesData.findIndex(m => m.slug === slug);
          setCurrentModuleIndex(index);
        }
      }

      // Fetch learner progress if user is logged in
      if (user && moduleData.id) {
        const { data: progressData } = await supabase
          .from('learner_progress')
          .select('progress_percentage')
          .eq('module_id', moduleData.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (progressData) {
          setProgress(progressData.progress_percentage);
        }
      }
    } catch (error: any) {
      console.error('Error fetching module:', error);
      toast({
        title: "Error loading module",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const markComplete = async () => {
    if (!module || !user) return;

    try {
      const { error } = await supabase
        .from('learner_progress')
        .upsert({
          user_id: user.id,
          module_id: module.id,
          progress_percentage: 100,
          completed_at: new Date().toISOString(),
        });

      if (error) throw error;

      setProgress(100);
      toast({
        title: "Module completed!",
        description: "Great job! Moving to the next module...",
      });

      // Navigate to next module if available
      if (currentModuleIndex < courseModules.length - 1) {
        const nextModule = courseModules[currentModuleIndex + 1];
        navigate(`/academy/modules/${nextModule.slug}`);
      }
    } catch (error: any) {
      toast({
        title: "Error",
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

  if (!module) {
    return (
      <AppLayout>
        <div className="container max-w-6xl mx-auto p-6 text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Module not found</h2>
          <Link to="/academy">
            <Button>Back to Academy</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const totalModules = courseModules.length;
  const totalDuration = courseModules.reduce((acc, m) => acc + (m.estimated_minutes || 0), 0);
  const completedModules = Math.floor((progress / 100) * totalModules);

  return (
    <AppLayout>
      <div className="container max-w-7xl mx-auto p-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/academy" className="hover:text-foreground">
            <BookOpen className="h-4 w-4 inline mr-1" />
            Courses
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link 
            to={`/courses/${module.course.slug}`}
            className="hover:text-foreground"
          >
            {module.course.title}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">{module.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 space-y-6">
            {/* Course Header */}
            <div className="space-y-4">
              <Link to={`/courses/${module.course.slug}`}>
                <Button variant="ghost" size="sm" className="squircle-sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Course
                </Button>
              </Link>

              <div>
                <h1 className="text-3xl font-bold mb-2">{module.title}</h1>
                <Badge variant="outline" className="squircle-sm">
                  {module.course.difficulty_level}
                </Badge>
              </div>

              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <PlayCircle className="h-4 w-4" />
                  <span>{totalModules} lessons</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{Math.floor(totalDuration / 60)}h {totalDuration % 60}min</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  <span>4.5 (126 reviews)</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button className="flex-1">
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Enroll Now
                </Button>
                <Button variant="outline">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Video Player */}
            <Card className="overflow-hidden">
              <div className="aspect-video bg-muted flex items-center justify-center">
                {module.video_url ? (
                  <video 
                    src={module.video_url} 
                    controls 
                    className="w-full h-full"
                  />
                ) : (
                  <div className="text-center p-12">
                    <PlayCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Video content coming soon</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="squircle">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="author">Author</TabsTrigger>
                <TabsTrigger value="faq">FAQ</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-6">
                <Card className="p-6">
                  <h3 className="text-xl font-bold mb-4">About Module</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {module.description}
                  </p>
                </Card>

                <Card className="p-6">
                  <h3 className="text-xl font-bold mb-4">What You'll Learn</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      "Setting up the environment",
                      "Advanced HTML Practices",
                      "Build a portfolio website",
                      "Responsive Designs",
                      "Understand HTML Programming",
                      "Code HTML",
                      "Start building beautiful websites",
                    ].map((item, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="author" className="mt-6">
                <Card className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={module.course.profiles?.avatar_url} />
                      <AvatarFallback>
                        {module.course.profiles?.full_name?.[0] || "A"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-lg">
                          {module.course.profiles?.full_name || "Expert Instructor"}
                        </h3>
                        <Badge variant="secondary" className="squircle-sm">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="h-4 w-4 fill-primary text-primary" />
                          <span className="font-semibold">4.8</span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        UI/UX Specialist
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        A seasoned UI/UX designer with over a decade of experience crafting 
                        user-centered digital experiences. Passionate about teaching and helping 
                        others master modern design tools and methodologies.
                      </p>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="faq" className="mt-6">
                <Card className="p-6">
                  <h3 className="text-xl font-bold mb-4">Frequently Asked Questions</h3>
                  <p className="text-muted-foreground text-sm">
                    Coming soon...
                  </p>
                </Card>
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                <Card className="p-6">
                  <h3 className="text-xl font-bold mb-4">Student Reviews</h3>
                  <p className="text-muted-foreground text-sm">
                    No reviews yet. Be the first to review this module!
                  </p>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar - Right Side */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6">
              <h3 className="font-bold mb-4">Course Content</h3>
              
              <div className="space-y-4">
                {/* Group modules by section - for now just show all */}
                <Accordion type="single" collapsible defaultValue="section-1">
                  <AccordionItem value="section-1">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <span className="text-sm font-semibold">
                          01: Course Modules
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {Math.floor(totalDuration / 60)}h {totalDuration % 60}min
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 mt-2">
                        {courseModules.map((mod, index) => {
                          const isActive = mod.slug === slug;
                          const isCompleted = progress === 100 && index < currentModuleIndex;
                          
                          return (
                            <Link 
                              key={mod.id} 
                              to={`/academy/modules/${mod.slug}`}
                              className={`block`}
                            >
                              <div
                                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                                  isActive 
                                    ? 'bg-primary/10 text-primary' 
                                    : 'hover:bg-muted'
                                }`}
                              >
                                {isCompleted ? (
                                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                                ) : (
                                  <PlayCircle className="h-4 w-4 flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {mod.title}
                                  </p>
                                  {mod.estimated_minutes && (
                                    <p className="text-xs text-muted-foreground">
                                      {mod.estimated_minutes} min
                                    </p>
                                  )}
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </Card>

            {/* Author Card */}
            <Card className="p-6">
              <h3 className="font-bold mb-4">Author</h3>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={module.course.profiles?.avatar_url} />
                  <AvatarFallback>
                    {module.course.profiles?.full_name?.[0] || "A"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate">
                      {module.course.profiles?.full_name || "Expert Instructor"}
                    </p>
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-primary text-primary" />
                    <span>4.8</span>
                  </div>
                </div>
              </div>
              <Separator className="my-4" />
              <p className="text-sm text-muted-foreground">
                UI/UX Specialist with expertise in modern design tools and methodologies.
              </p>
            </Card>

            {/* Progress Card */}
            {user && (
              <Card className="p-6">
                <h3 className="font-bold mb-4">Your Progress</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">
                        {completedModules} of {totalModules} complete
                      </span>
                      <span className="font-semibold">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                  
                  <Button 
                    onClick={markComplete} 
                    className="w-full"
                    disabled={progress === 100}
                  >
                    {progress === 100 ? (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Completed
                      </>
                    ) : (
                      "Mark as Complete"
                    )}
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

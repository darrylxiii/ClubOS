import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { notify } from "@/lib/notify";
import { CreateModuleDialog } from "@/components/academy/CreateModuleDialog";
import { CourseAIChat } from "@/components/academy/CourseAIChat";
import { CourseProgressRing } from "@/components/academy/CourseProgressRing";
import { CourseCompletionModal } from "@/components/academy/CourseCompletionModal";
import { ModuleQuiz } from "@/components/academy/ModuleQuiz";
import { NoteEditor } from "@/components/academy/NoteEditor";
import { CourseReviewForm } from "@/components/academy/CourseReviewForm";
import { AverageRatingDisplay } from "@/components/academy/AverageRatingDisplay";
import { CertificatePreview } from "@/components/academy/CertificatePreview";
import { 
  BookOpen, 
  Clock, 
  PlayCircle,
  CheckCircle2,
  Star,
  Share2,
  ChevronRight,
  Plus,
  Loader2
} from "lucide-react";

export default function CourseDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [showModuleDialog, setShowModuleDialog] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [certificate, setCertificate] = useState<any>(null);
  const [selectedModule, setSelectedModule] = useState<any>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);

  useEffect(() => {
    loadCourseData();
  }, [slug, user]);

  const loadCourseData = async () => {
    try {
      setLoading(true);

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

      const { data: modulesData } = await supabase
        .from("modules")
        .select("*")
        .eq("course_id", courseData.id)
        .order("display_order");

      setModules(modulesData || []);

      // Fetch course progress if user is logged in
      if (user && courseData.id) {
        const { data: progressData } = await supabase
          .from('learner_progress')
          .select('progress_percentage')
          .eq('user_id', user.id)
          .in('module_id', modulesData?.map(m => m.id) || []);

        if (progressData && progressData.length > 0) {
          const avgProgress = progressData.reduce((sum, p) => sum + p.progress_percentage, 0) / progressData.length;
          setProgress(avgProgress);
          
          // Check if course just completed
          if (avgProgress >= 100) {
            const { data: certData } = await supabase
              .from('certificates' as any)
              .select('*')
              .eq('user_id', user.id)
              .eq('course_id', courseData.id)
              .maybeSingle();
            
            if (certData) {
              setCertificate(certData);
            }
          }
        }
      }
    } catch (error: unknown) {
      notify.error("Error loading course", { description: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePublishToggle = async () => {
    if (!course) return;

    try {
      const { error } = await supabase
        .from("courses")
        .update({ is_published: !course.is_published })
        .eq("id", course.id);

      if (error) throw error;

      notify.success(
        course.is_published ? "Course unpublished" : "Course published",
        { description: course.is_published ? "Course is now hidden from students" : "Course is now visible to students" }
      );

      setCourse({ ...course, is_published: !course.is_published });
    } catch (error: unknown) {
      notify.error("Error updating course", { description: error instanceof Error ? error.message : 'Unknown error' });
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
          <Link to="/academy">
            <Button>Back to Academy</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const totalModules = modules.length;
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
          <span className="text-foreground">{course.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 space-y-6">
            {/* Course Header */}
            <div className="space-y-4">
              {/* Progress Ring */}
              {user && progress > 0 && (
                <CourseProgressRing 
                  progress={progress}
                  completedModules={completedModules}
                  totalModules={totalModules}
                />
              )}

              {/* Certificate Display */}
              {certificate && (
                <CertificatePreview certificateId={certificate.id} />
              )}

              {isOwner && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handlePublishToggle}
                    size="sm"
                  >
                    {course.is_published ? "Unpublish" : "Publish"}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/academy/courses/${course.id}/edit`)}
                  >
                    Edit Course
                  </Button>
                </div>
              )}

              <div>
                <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
                <Badge variant="outline" className="squircle-sm">
                  {course.difficulty_level}
                </Badge>
              </div>

              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <PlayCircle className="h-4 w-4" />
                  <span>{totalModules} lessons</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{course.estimated_hours}h</span>
                </div>
                <AverageRatingDisplay
                  rating={course.rating_average}
                  count={course.rating_count}
                />
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    <Avatar className="h-6 w-6 border-2 border-background">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">A</AvatarFallback>
                    </Avatar>
                    <Avatar className="h-6 w-6 border-2 border-background">
                      <AvatarFallback className="bg-secondary/10 text-secondary text-xs">B</AvatarFallback>
                    </Avatar>
                    <Avatar className="h-6 w-6 border-2 border-background">
                      <AvatarFallback className="bg-accent/10 text-accent text-xs">C</AvatarFallback>
                    </Avatar>
                  </div>
                  <span>26 enrolled</span>
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

              {/* AI Course Chat */}
              <CourseAIChat courseId={course.id} />
            </div>

            {/* Course Preview Video */}
            <Card className="overflow-hidden">
              <div className="aspect-video bg-muted flex items-center justify-center">
                <div className="text-center p-12">
                  <PlayCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Course preview coming soon</p>
                </div>
              </div>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="squircle">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="instructor">Instructor</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-6">
                <Card className="p-6">
                  <h3 className="text-xl font-bold mb-4">About This Course</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {course.description}
                  </p>
                </Card>

                <Card className="p-6">
                  <h3 className="text-xl font-bold mb-4">What You'll Learn</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      "Master the fundamentals",
                      "Build real-world projects",
                      "Industry best practices",
                      "Advanced techniques",
                      "Professional workflow",
                      "Portfolio-ready skills",
                    ].map((item, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="instructor" className="mt-6">
                <Card className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={course.profiles?.avatar_url} />
                      <AvatarFallback>
                        {course.profiles?.full_name?.[0] || "I"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-lg">
                          {course.profiles?.full_name || "Expert Instructor"}
                        </h3>
                        <Badge variant="secondary" className="squircle-sm">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Expert Instructor & Industry Professional
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        A seasoned professional with extensive experience in the field. 
                        Passionate about teaching and helping others master modern skills and methodologies.
                      </p>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                <div className="space-y-6">
                  {progress >= 100 && user && (
                    <Card className="p-6">
                      <Button onClick={() => setShowReviewDialog(true)}>
                        Write a Review
                      </Button>
                    </Card>
                  )}
                  <Card className="p-6">
                    <h3 className="text-xl font-bold mb-4">Student Reviews</h3>
                    <p className="text-muted-foreground text-sm">
                      No reviews yet. Be the first to review this course!
                    </p>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="notes" className="mt-6">
                <Card className="p-6">
                  <h3 className="text-xl font-bold mb-4">Course Notes</h3>
                  {selectedModule ? (
                    <NoteEditor moduleId={selectedModule.id} />
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Select a module to take notes
                    </p>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar - Right Side */}
          <div className="lg:col-span-1 space-y-6">
            {/* Instructor Card */}
            <Card className="p-6">
              <h3 className="font-bold mb-4">Instructor</h3>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={course.profiles?.avatar_url} />
                  <AvatarFallback>
                    {course.profiles?.full_name?.[0] || "I"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate">
                      {course.profiles?.full_name || "Expert Instructor"}
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
                Expert instructor with extensive industry experience.
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">Course Content</h3>
                {isOwner && (
                  <Button onClick={() => setShowModuleDialog(true)} size="sm" variant="ghost">
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <div className="space-y-4">
                <Accordion type="single" collapsible defaultValue="section-1">
                  <AccordionItem value="section-1">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <span className="text-sm font-semibold">
                          Course Modules
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {totalModules} lessons
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {modules.length === 0 ? (
                        <div className="text-center py-6">
                          <p className="text-sm text-muted-foreground mb-3">No modules yet</p>
                          {isOwner && (
                            <Button onClick={() => setShowModuleDialog(true)} size="sm">
                              <Plus className="mr-2 h-4 w-4" />
                              Add First Module
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2 mt-2">
                          {modules.map((mod, index) => (
                            <Link 
                              key={mod.id} 
                              to={`/academy/modules/${mod.slug}`}
                              className="block"
                            >
                              <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                                <PlayCircle className="h-4 w-4 flex-shrink-0" />
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
                          ))}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
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
                </div>
              </Card>
            )}
          </div>
        </div>

        <CreateModuleDialog
          open={showModuleDialog}
          onOpenChange={setShowModuleDialog}
          courseId={course.id}
          onSuccess={loadCourseData}
          nextDisplayOrder={modules.length + 1}
        />

        <CourseReviewForm
          open={showReviewDialog}
          onOpenChange={setShowReviewDialog}
          courseId={course.id}
          courseName={course.title}
          onReviewSubmitted={loadCourseData}
        />

        <CourseCompletionModal
          open={showCompletionModal}
          onOpenChange={setShowCompletionModal}
          courseName={course.title}
          certificateId={certificate?.id}
        />
      </div>
    </AppLayout>
  );
}

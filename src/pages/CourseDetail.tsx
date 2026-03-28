import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, Link, useNavigate } from "react-router-dom";
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
import { ErrorState } from "@/components/ui/error-state";
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

interface CourseData {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
  difficulty_level: string | null;
  estimated_hours: number | null;
  is_published: boolean;
  created_by: string;
  created_at: string;
  cover_image_url: string | null;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
  [key: string]: unknown;
}

interface ModuleData {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  display_order: number;
  module_type: string | null;
  estimated_minutes: number | null;
  [key: string]: unknown;
}

interface CertificateData {
  id: string;
  user_id: string;
  course_id: string;
  issued_at: string;
  certificate_url: string | null;
  [key: string]: unknown;
}

export default function CourseDetail() {
  const { t } = useTranslation('common');
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [showModuleDialog, setShowModuleDialog] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [selectedModule, setSelectedModule] = useState<ModuleData | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);

  const { data: courseQueryData, isLoading: loading, isError: fetchError, refetch } = useQuery({
    queryKey: ['course-detail', slug, user?.id],
    queryFn: async () => {
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select(`*, profiles:created_by(full_name, avatar_url)`)
        .eq("slug", slug)
        .maybeSingle();

      if (courseError) throw courseError;
      if (!courseData) {
        return null;
      }

      const { data: modulesData } = await supabase
        .from("modules")
        .select("*")
        .eq("course_id", courseData.id)
        .order("display_order");

      let progress = 0;
      let certificate: CertificateData | null = null;
      let isEnrolled = false;

      if (user && courseData.id) {
        // Check enrollment
        const { data: enrollmentData } = await supabase
          .from('course_progress')
          .select('id, progress_percentage')
          .eq('user_id', user.id)
          .eq('course_id', courseData.id)
          .maybeSingle();

        isEnrolled = !!enrollmentData;

        const { data: progressData } = await supabase
          .from('learner_progress')
          .select('progress_percentage')
          .eq('user_id', user.id)
          .in('module_id', modulesData?.map(m => m.id) || []);

        if (progressData && progressData.length > 0) {
          progress = progressData.reduce((sum, p) => sum + p.progress_percentage, 0) / progressData.length;

          if (progress >= 100) {
            // Auto-create certificate if it doesn't exist
            const { data: certData } = await supabase
              .from('certificates')
              .select('*')
              .eq('user_id', user.id)
              .eq('course_id', courseData.id)
              .maybeSingle();

            if (certData) {
              certificate = certData as CertificateData;
            } else {
              // Create certificate on first 100% completion
              const { data: newCert } = await supabase
                .from('certificates')
                .insert({
                  user_id: user.id,
                  course_id: courseData.id,
                  metadata: { courseName: courseData.title },
                })
                .select('*')
                .single();
              if (newCert) certificate = newCert as CertificateData;
            }
          }
        }
      }

      // Fetch reviews for this course
      const { data: reviewsData } = await supabase
        .from('course_reviews')
        .select('id, rating, review_text, would_recommend, created_at, profiles:user_id(full_name)')
        .eq('course_id', courseData.id)
        .order('created_at', { ascending: false })
        .limit(10);

      return {
        course: courseData as unknown as CourseData,
        modules: (modulesData || []) as unknown as ModuleData[],
        isOwner: user?.id === courseData.created_by,
        progress,
        certificate,
        isEnrolled,
        reviews: reviewsData || [],
      };
    },
    enabled: !!slug,
  });

  if (fetchError) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <ErrorState
          variant="page"
          title={t('courseDetail.text5')}
          message="We couldn't load this course. Please try again."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  // Redirect if course not found (after loading)
  if (!loading && courseQueryData === null) {
    notify.error("Course not found");
    navigate("/academy");
    return null;
  }

  const course = courseQueryData?.course ?? null;
  const modules = courseQueryData?.modules ?? [];
  const isOwner = courseQueryData?.isOwner ?? false;
  const progress = courseQueryData?.progress ?? 0;
  const certificate = courseQueryData?.certificate ?? null;
  const isEnrolled = courseQueryData?.isEnrolled ?? false;
  const reviews = courseQueryData?.reviews ?? [];

  // Trigger completion modal when progress reaches 100% for the first time
  const [hasShownCompletion, setHasShownCompletion] = useState(false);
  if (progress >= 100 && certificate && !hasShownCompletion && !showCompletionModal) {
    setShowCompletionModal(true);
    setHasShownCompletion(true);
  }

  const loadCourseData = () => {
    queryClient.invalidateQueries({ queryKey: ['course-detail', slug, user?.id] });
  };

  const handleEnroll = async () => {
    if (!user) {
      navigate(`/auth?redirect_to=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (!course) return;

    try {
      const { error } = await supabase
        .from('course_progress')
        .upsert({
          user_id: user.id,
          course_id: course.id,
          progress_percentage: 0,
          modules_completed: 0,
          total_modules: modules.length,
          started_at: new Date().toISOString(),
        }, { onConflict: 'user_id,course_id' });

      if (error) throw error;

      notify.success("Enrolled!", { description: `You're now enrolled in ${course.title}` });
      loadCourseData();

      // Navigate to first module if available
      if (modules.length > 0) {
        navigate(`/modules/${modules[0].slug || modules[0].id}`);
      }
    } catch (error: unknown) {
      notify.error("Enrollment failed", { description: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const handleShare = async () => {
    if (!course || !user) return;

    try {
      // Check if share link already exists for this course by this user
      const { data: existing } = await supabase
        .from('course_share_links')
        .select('token')
        .eq('course_id', course.id)
        .eq('created_by', user.id)
        .eq('is_active', true)
        .maybeSingle();

      let token = existing?.token;

      if (!token) {
        const { data: newLink, error } = await supabase
          .from('course_share_links')
          .insert({
            course_id: course.id,
            created_by: user.id,
          })
          .select('token')
          .single();

        if (error) throw error;
        token = newLink.token;
      }

      // Use public URL for public courses, share token for others
      const visibility = (course as any).visibility;
      const shareUrl = visibility === 'public'
        ? `${window.location.origin}/learn/${course.slug}`
        : `${window.location.origin}/learn/share/${token}`;

      await navigator.clipboard.writeText(shareUrl);
      notify.success("Link copied!", { description: "Share link copied to clipboard" });
    } catch (error: unknown) {
      notify.error("Failed to create share link", { description: error instanceof Error ? error.message : 'Unknown error' });
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

      loadCourseData();
    } catch (error: unknown) {
      notify.error("Error updating course", { description: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 text-center py-12">
        <h2 className="text-2xl font-bold mb-4">{t('courseDetail.text6')}</h2>
        <Link to="/academy">
          <Button>{t('courseDetail.text7')}</Button>
        </Link>
      </div>
    );
  }

  const totalModules = modules.length;
  const completedModules = Math.floor((progress / 100) * totalModules);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
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
                  onClick={() => navigate(`/courses/${course.id}/edit`)}
                >
                  Edit Course
                </Button>
              </div>
            )}

            <div>
              <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
              <Badge variant="outline" className="rounded-xl">
                {course.difficulty_level}
              </Badge>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
              <div className="flex items-center gap-2">
                <PlayCircle className="h-4 w-4" />
                <span>{totalModules} lessons</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{course.estimated_hours}h</span>
              </div>
              <AverageRatingDisplay
                rating={course.rating_average as number}
                count={course.rating_count as number}
              />
              {(course.enrolled_count as number) > 0 && (
                <div className="flex items-center gap-2">
                  <span>{course.enrolled_count} enrolled</span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              {isEnrolled ? (
                <Button className="flex-1" onClick={() => {
                  if (modules.length > 0) navigate(`/modules/${modules[0].slug || modules[0].id}`);
                }}>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Continue Learning
                </Button>
              ) : modules.length === 0 ? (
                <Button className="flex-1" disabled variant="secondary">
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Coming Soon — No Modules Yet
                </Button>
              ) : (
                <Button className="flex-1" onClick={handleEnroll}>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Enroll Now
                </Button>
              )}
              <Button variant="outline" onClick={handleShare}>
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
                <p className="text-muted-foreground">{t('courseDetail.text8')}</p>
              </div>
            </div>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="rounded-2xl">
              <TabsTrigger value="overview">{t('courseDetail.text9')}</TabsTrigger>
              <TabsTrigger value="instructor">{t('courseDetail.text10')}</TabsTrigger>
              <TabsTrigger value="reviews">{t('courseDetail.text11')}</TabsTrigger>
              <TabsTrigger value="notes">{t('courseDetail.text12')}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              <Card className="p-6">
                <h3 className="text-xl font-bold mb-4">{t('courseDetail.text13')}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {course.description}
                </p>
              </Card>

              {course.learning_objectives && Array.isArray(course.learning_objectives) && (course.learning_objectives as string[]).length > 0 && (
                <Card className="p-6">
                  <h3 className="text-xl font-bold mb-4">{t('courseDetail.text14')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(course.learning_objectives as string[]).map((item: string, index: number) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
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
                      <Badge variant="secondary" className="rounded-xl">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">{t('courseDetail.desc')}</p>
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
                {reviews.length > 0 ? (
                  <Card className="p-6">
                    <h3 className="text-xl font-bold mb-4">{t('courseDetail.text15', 'Student Reviews')}</h3>
                    <div className="space-y-4">
                      {reviews.map((review: any) => (
                        <div key={review.id} className="space-y-2 pb-4 border-b last:border-0 last:pb-0">
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map(s => (
                                <Star
                                  key={s}
                                  className={`h-4 w-4 ${s <= review.rating ? "fill-yellow-500 text-yellow-500" : "text-muted"}`}
                                />
                              ))}
                            </div>
                            <span className="text-sm font-medium">
                              {(review.profiles as any)?.full_name || 'Student'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {review.review_text && (
                            <p className="text-sm text-muted-foreground">{review.review_text}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                ) : (
                  <Card className="p-6">
                    <h3 className="text-xl font-bold mb-4">{t('courseDetail.text15', 'Student Reviews')}</h3>
                    <p className="text-muted-foreground text-sm">No reviews yet. Be the first to review this course!</p>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="notes" className="mt-6">
              <Card className="p-6">
                <h3 className="text-xl font-bold mb-4">{t('courseDetail.text16', 'My Notes')}</h3>
                {modules.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No modules available for notes yet.</p>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {modules.map((mod, idx) => (
                        <Button
                          key={mod.id}
                          variant={selectedModule?.id === mod.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedModule(mod)}
                        >
                          {idx + 1}. {mod.title.length > 25 ? mod.title.slice(0, 25) + '...' : mod.title}
                        </Button>
                      ))}
                    </div>
                    {selectedModule ? (
                      <NoteEditor moduleId={selectedModule.id} />
                    ) : (
                      <p className="text-muted-foreground text-sm">Select a module above to view or add notes.</p>
                    )}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar - Right Side */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">{t('courseDetail.text18')}</h3>
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
                        <p className="text-sm text-muted-foreground mb-3">{t('courseDetail.text19')}</p>
                        {isOwner && (
                          <Button onClick={() => setShowModuleDialog(true)} size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Add First Module
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {modules.map((mod, index) => (
                          <button
                            key={mod.id}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm hover:bg-muted/50 transition-colors text-left ${
                              selectedModule?.id === mod.id ? 'bg-primary/10 text-primary' : ''
                            }`}
                            onClick={() => setSelectedModule(mod)}
                          >
                            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-muted text-xs font-medium flex-shrink-0">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{mod.title}</p>
                              {mod.estimated_minutes && (
                                <p className="text-xs text-muted-foreground">
                                  {mod.estimated_minutes} min
                                </p>
                              )}
                            </div>
                            {isOwner && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/modules/${mod.id}/edit`);
                                }}
                              >
                                ✏️
                              </Button>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </Card>

          {/* Module Quiz */}
          {selectedModule && (
            <ModuleQuiz quizId={selectedModule.id} onComplete={() => loadCourseData()} />
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
  );
}


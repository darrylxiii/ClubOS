import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  Clock,
  PlayCircle,
  CheckCircle2,
  Star,
  Share2,
  Lock,
  Users,
  ExternalLink,
} from "lucide-react";

export default function PublicCourseView() {
  const { slug, token } = useParams();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation('common');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-course', slug, token],
    queryFn: async () => {
      let courseQuery = supabase
        .from("courses")
        .select(`*, profiles:created_by(full_name, avatar_url)`)
        .eq("is_published", true);

      if (token) {
        // Unlisted access via share link
        const { data: shareLink } = await supabase
          .from("course_share_links")
          .select("course_id")
          .eq("token", token)
          .eq("is_active", true)
          .maybeSingle();

        if (!shareLink) return null;

        // Increment view count
        await supabase.rpc('increment_share_view_count' as any, { link_token: token }).catch(() => {});

        // Token-based access works for ANY visibility (including private)
        const { data: courseData } = await supabase
          .from("courses")
          .select(`*, profiles:created_by(full_name, avatar_url)`)
          .eq("id", shareLink.course_id)
          .maybeSingle();

        if (!courseData) return null;

        const { data: modulesData } = await supabase
          .from("modules")
          .select("id, title, description, display_order, estimated_minutes, is_free, module_type, slug")
          .eq("course_id", courseData.id)
          .order("display_order");

        const { data: reviews } = await supabase
          .from("course_reviews")
          .select("rating, review_text, created_at, profiles:user_id(full_name)")
          .eq("course_id", courseData.id)
          .order("created_at", { ascending: false })
          .limit(5);

        return { course: courseData, modules: modulesData || [], reviews: reviews || [] };
      }

      // Public access via slug
      const { data: courseData } = await courseQuery
        .eq("slug", slug)
        .in("visibility", ["public", "unlisted"])
        .maybeSingle();

      if (!courseData) return null;

      const { data: modulesData } = await supabase
        .from("modules")
        .select("id, title, description, display_order, estimated_minutes, is_free, module_type, slug")
        .eq("course_id", courseData.id)
        .order("display_order");

      const { data: reviews } = await supabase
        .from("course_reviews")
        .select("rating, review_text, created_at, profiles:user_id(full_name)")
        .eq("course_id", courseData.id)
        .order("created_at", { ascending: false })
        .limit(5);

      return { course: courseData, modules: modulesData || [], reviews: reviews || [] };
    },
    enabled: !!(slug || token),
  });

  const handleShare = async () => {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading course...</div>
      </div>
    );
  }

  if (isError || !data?.course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-12 text-center max-w-md">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">{t('publicCourse.courseNotFound', 'Course Not Found')}</h2>
          <p className="text-muted-foreground mb-6">
            This course may be private or the link may have expired.
          </p>
          <Button onClick={() => navigate(`/auth?redirect_to=${encodeURIComponent(window.location.pathname)}`)}>
            Sign in to explore courses
          </Button>
        </Card>
      </div>
    );
  }

  const { course, modules, reviews } = data;
  const totalMinutes = modules.reduce((sum: number, m: any) => sum + (m.estimated_minutes || 0), 0);
  const freeModules = modules.filter((m: any) => m.is_free);
  const avgRating = course.rating_average ? Number(course.rating_average).toFixed(1) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <BookOpen className="h-4 w-4 text-primary" />
            <span>{t('common:clubOsAcademy', 'ClubOS Academy')}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              {copied ? "Copied!" : "Share"}
            </Button>
            <Button size="sm" onClick={() => navigate(`/auth?redirect_to=${encodeURIComponent(window.location.pathname)}`)}>
              Sign in to enroll
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero */}
            {course.course_image_url && (
              <div className="aspect-video rounded-xl overflow-hidden">
                <img
                  src={course.course_image_url}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                {course.category && (
                  <Badge variant="outline">{course.category}</Badge>
                )}
                {course.difficulty_level && (
                  <Badge variant="secondary">{course.difficulty_level}</Badge>
                )}
              </div>

              <h1 className="text-4xl font-bold tracking-tight">{course.title}</h1>

              <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1">
                  <PlayCircle className="h-4 w-4" />
                  <span>{modules.length} lessons</span>
                </div>
                {course.estimated_hours && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{course.estimated_hours}h</span>
                  </div>
                )}
                {course.enrolled_count > 0 && (
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{course.enrolled_count} enrolled</span>
                  </div>
                )}
                {avgRating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    <span>{avgRating} ({course.rating_count} reviews)</span>
                  </div>
                )}
              </div>

              {course.description && (
                <p className="text-muted-foreground leading-relaxed text-lg">
                  {course.description}
                </p>
              )}

              {/* Instructor */}
              {course.profiles && (
                <div className="flex items-center gap-3 pt-2">
                  <Avatar>
                    <AvatarImage src={course.profiles.avatar_url} />
                    <AvatarFallback>{course.profiles.full_name?.[0] || "I"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{course.profiles.full_name || "Instructor"}</p>
                    <p className="text-sm text-muted-foreground">{t('publicCourse.courseCreator', 'Course Creator')}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Learning Objectives */}
            {course.learning_objectives && Array.isArray(course.learning_objectives) && course.learning_objectives.length > 0 && (
              <Card className="p-6">
                <h3 className="text-xl font-bold mb-4">{t('publicCourse.whatYoullLearn', "What You'll Learn")}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(course.learning_objectives as string[]).map((item: string, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <Card className="p-6">
                <h3 className="text-xl font-bold mb-4">{t('publicCourse.studentReviews', 'Student Reviews')}</h3>
                <div className="space-y-4">
                  {reviews.map((review: any, i: number) => (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star
                              key={s}
                              className={`h-4 w-4 ${s <= review.rating ? "fill-yellow-500 text-yellow-500" : "text-muted"}`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {(review.profiles as any)?.full_name || "Student"}
                        </span>
                      </div>
                      {review.review_text && (
                        <p className="text-sm text-muted-foreground">{review.review_text}</p>
                      )}
                      {i < reviews.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Enroll CTA */}
            <Card className="p-6 sticky top-20">
              <h3 className="font-bold text-lg mb-4">{t('publicCourse.readyToLearn', 'Ready to learn?')}</h3>
              <Button className="w-full mb-4" size="lg" onClick={() => navigate(`/auth?redirect_to=${encodeURIComponent(window.location.pathname)}`)}>
                <PlayCircle className="mr-2 h-5 w-5" />
                Sign in to Enroll
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Join ClubOS to access this course and {freeModules.length > 0 ? "more" : "all"} content
              </p>

              <Separator className="my-4" />

              {/* Course Info */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Modules</span>
                  <span className="font-medium">{modules.length}</span>
                </div>
                {totalMinutes > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-medium">{Math.round(totalMinutes / 60)}h {totalMinutes % 60}m</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Level</span>
                  <span className="font-medium capitalize">{course.difficulty_level || "All levels"}</span>
                </div>
                {course.enrolled_count > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Enrolled</span>
                    <span className="font-medium">{course.enrolled_count} students</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Module List */}
            <Card className="p-6">
              <h3 className="font-bold mb-4">{t('publicCourse.courseContent', 'Course Content')}</h3>
              <Accordion type="single" collapsible defaultValue="modules">
                <AccordionItem value="modules" className="border-none">
                  <AccordionTrigger className="hover:no-underline py-0">
                    <span className="text-sm">{modules.length} lessons</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-1 mt-2">
                      {modules.map((mod: any, index: number) => (
                        <div
                          key={mod.id}
                          className="flex items-center gap-3 p-3 rounded-lg text-sm"
                        >
                          <div className="flex items-center justify-center h-6 w-6 rounded-full bg-muted text-xs font-medium flex-shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{mod.title}</p>
                            {mod.estimated_minutes && (
                              <p className="text-xs text-muted-foreground">{mod.estimated_minutes} min</p>
                            )}
                          </div>
                          {mod.is_free ? (
                            <Badge variant="secondary" className="text-xs">Free</Badge>
                          ) : (
                            <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>

            {/* Social Share */}
            <Card className="p-6">
              <h3 className="font-bold mb-3">{t('publicCourse.shareCourse', 'Share this course')}</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Check out this course: ${course.title} ${window.location.href}`)}`, '_blank')}
                >
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`, '_blank')}
                >
                  LinkedIn
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out: ${course.title}`)}&url=${encodeURIComponent(window.location.href)}`, '_blank')}
                >
                  X
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

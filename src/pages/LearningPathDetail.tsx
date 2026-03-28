import { Link, useParams } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  BookOpen,
  Clock,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  GraduationCap,
} from "lucide-react";
import { SectionLoader } from "@/components/ui/unified-loader";

export default function LearningPathDetail() {
  const { t } = useTranslation('common');
  const { slug } = useParams();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['learning-path', slug, user?.id],
    queryFn: async () => {
      const { data: pathData, error } = await supabase
        .from("learning_paths")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (error || !pathData) return null;

      // Fetch courses in this learning path
      const { data: courses } = await supabase
        .from("courses")
        .select("*, profiles:created_by(full_name)")
        .eq("learning_path_id", pathData.id)
        .eq("is_published", true)
        .order("display_order");

      // Fetch user progress per course
      let courseProgress: Record<string, number> = {};
      if (user && courses) {
        const { data: progressData } = await supabase
          .from("course_progress")
          .select("course_id, progress_percentage")
          .eq("user_id", user.id)
          .in("course_id", courses.map(c => c.id));

        progressData?.forEach(p => {
          courseProgress[p.course_id] = p.progress_percentage ?? 0;
        });
      }

      // Check enrollment
      let isEnrolled = false;
      if (user) {
        const { data: enrollment } = await supabase
          .from("path_enrollments")
          .select("id")
          .eq("user_id", user.id)
          .eq("learning_path_id", pathData.id)
          .maybeSingle();
        isEnrolled = !!enrollment;
      }

      return {
        path: pathData,
        courses: courses || [],
        courseProgress,
        isEnrolled,
      };
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <SectionLoader />
      </div>
    );
  }

  if (!data?.path) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 text-center py-12">
        <h2 className="text-2xl font-bold mb-4">{t('learningPathDetail.notFound', 'Learning Path Not Found')}</h2>
        <Link to="/academy">
          <Button>{t('learningPathDetail.backToAcademy', 'Back to Academy')}</Button>
        </Link>
      </div>
    );
  }

  const { path, courses, courseProgress } = data;
  const totalProgress = courses.length > 0
    ? Math.round(courses.reduce((sum, c) => sum + (courseProgress[c.id] || 0), 0) / courses.length)
    : 0;
  const completedCourses = courses.filter(c => (courseProgress[c.id] || 0) >= 100).length;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/academy" className="hover:text-foreground">
          <BookOpen className="h-4 w-4 inline mr-1" />
          Academy
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{path.name}</span>
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{path.name}</h1>
              {path.description && (
                <p className="text-muted-foreground mt-1">{path.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              <span>{courses.length} courses</span>
            </div>
            {path.estimated_hours && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{path.estimated_hours}h total</span>
              </div>
            )}
            {path.difficulty_level && (
              <Badge variant="outline">{path.difficulty_level}</Badge>
            )}
          </div>

          {/* Overall Progress */}
          {user && totalProgress > 0 && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{t('learningPathDetail.yourProgress', 'Your Progress')}</span>
                <span className="text-sm font-semibold">{completedCourses}/{courses.length} courses</span>
              </div>
              <Progress value={totalProgress} className="h-2" />
            </Card>
          )}
        </div>

        {/* Course List */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold">{t('learningPathDetail.coursesInPath', 'Courses in this Path')}</h2>
          {courses.length === 0 ? (
            <Card className="p-8 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {t('learningPathDetail.noCoursesYet', 'No courses in this learning path yet. Check back soon!')}
              </p>
            </Card>
          ) : courses.map((course, index) => {
            const progress = courseProgress[course.id] || 0;
            const isComplete = progress >= 100;

            return (
              <Link key={course.id} to={`/courses/${course.slug}`}>
                <Card className="p-6 hover:border-primary/30 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`flex items-center justify-center h-10 w-10 rounded-full flex-shrink-0 ${
                      isComplete ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'
                    }`}>
                      {isComplete ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <span className="text-sm font-bold">{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold">{course.title}</h3>
                      {course.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {course.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {course.estimated_hours && (
                          <span>{course.estimated_hours}h</span>
                        )}
                        {course.difficulty_level && (
                          <Badge variant="secondary" className="text-xs">{course.difficulty_level}</Badge>
                        )}
                      </div>
                      {progress > 0 && progress < 100 && (
                        <Progress value={progress} className="h-1 mt-3" />
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

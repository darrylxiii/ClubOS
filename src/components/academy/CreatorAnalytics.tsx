import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, TrendingUp, Star, BookOpen } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from 'react-i18next';

interface CreatorAnalyticsProps {
  creatorId: string;
}

interface CourseStats {
  courseId: string;
  courseTitle: string;
  enrollments: number;
  completionRate: number;
  avgRating: number | null;
  reviewCount: number;
}

export function CreatorAnalytics({ creatorId }: CreatorAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [courseStats, setCourseStats] = useState<CourseStats[]>([]);
  const { t } = useTranslation('common');

  useEffect(() => {
    loadAnalytics();
  }, [creatorId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Get creator's courses
      const { data: courses, error: coursesError } = await supabase
        .from("courses")
        .select("id, title")
        .eq("created_by", creatorId);

      if (coursesError) throw coursesError;
      if (!courses || courses.length === 0) {
        setCourseStats([]);
        return;
      }

      const courseIds = courses.map((c) => c.id);

      // Get enrollment / progress data
      const { data: progressData, error: progressError } = await supabase
        .from("course_progress")
        .select("course_id, completion_pct")
        .in("course_id", courseIds);

      if (progressError) throw progressError;

      // Get reviews data
      const { data: reviewsData, error: reviewsError } = await supabase
        .from("course_reviews")
        .select("course_id, rating")
        .in("course_id", courseIds);

      if (reviewsError) throw reviewsError;

      // Aggregate per course
      const stats: CourseStats[] = courses.map((course) => {
        const progress = (progressData || []).filter((p) => p.course_id === course.id);
        const reviews = (reviewsData || []).filter((r) => r.course_id === course.id);

        const enrollments = progress.length;
        const completionRate =
          enrollments > 0
            ? Math.round(
                progress.reduce((sum, p) => sum + (p.completion_pct || 0), 0) / enrollments
              )
            : 0;
        const avgRating =
          reviews.length > 0
            ? Math.round(
                (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length) * 10
              ) / 10
            : null;

        return {
          courseId: course.id,
          courseTitle: course.title,
          enrollments,
          completionRate,
          avgRating,
          reviewCount: reviews.length,
        };
      });

      setCourseStats(stats);
    } catch (error) {
      console.error("Error loading creator analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (courseStats.length === 0) {
    return (
      <Card className="p-12 text-center rounded-2xl">
        <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-semibold mb-2">{t('creatorAnalytics.noAnalyticsYet', 'No analytics yet')}</h3>
        <p className="text-muted-foreground">
          Create and publish courses to start seeing enrollment and rating data.
        </p>
      </Card>
    );
  }

  // Summary calculations
  const totalEnrollments = courseStats.reduce((sum, c) => sum + c.enrollments, 0);
  const avgCompletionRate =
    courseStats.length > 0
      ? Math.round(courseStats.reduce((sum, c) => sum + c.completionRate, 0) / courseStats.length)
      : 0;
  const ratedCourses = courseStats.filter((c) => c.avgRating !== null);
  const overallRating =
    ratedCourses.length > 0
      ? Math.round(
          (ratedCourses.reduce((sum, c) => sum + (c.avgRating || 0), 0) / ratedCourses.length) * 10
        ) / 10
      : null;

  return (
    <div className="space-y-6">
      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10">
              <Users className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('creatorAnalytics.totalEnrollments', 'Total Enrollments')}</p>
              <p className="text-2xl font-bold">{totalEnrollments}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10">
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('creatorAnalytics.avgCompletionRate', 'Avg Completion Rate')}</p>
              <p className="text-2xl font-bold">{avgCompletionRate}%</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-yellow-500/10">
              <Star className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('creatorAnalytics.avgRating', 'Avg Rating')}</p>
              <p className="text-2xl font-bold">{overallRating !== null ? overallRating : "--"}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Per-Course List */}
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">{t('creatorAnalytics.courseBreakdown', 'Course Breakdown')}</h3>
        {courseStats.map((course) => (
          <Card key={course.courseId} className="p-4 rounded-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{course.courseTitle}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {course.enrollments} enrolled
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5" />
                    {course.avgRating !== null
                      ? `${course.avgRating} (${course.reviewCount})`
                      : "No reviews"}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Progress value={course.completionRate} className="flex-1 h-2" />
                  <span className="text-xs font-medium text-muted-foreground w-10 text-right">
                    {course.completionRate}%
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

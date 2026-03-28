import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useAcademyDashboard() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['academy-dashboard', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Fetch course progress for stats
      const { data: progressData } = await supabase
        .from('course_progress')
        .select('progress_percentage, course_id, courses(category)')
        .eq('user_id', user.id);

      const ongoing = progressData?.filter(p => (p.progress_percentage ?? 0) > 0 && (p.progress_percentage ?? 0) < 100).length ?? 0;
      const completed = progressData?.filter(p => (p.progress_percentage ?? 0) >= 100).length ?? 0;

      // Fetch certificates count
      const { count: certificateCount } = await supabase
        .from('certificates')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Fetch total time spent
      const { data: timeData } = await supabase
        .from('learner_progress')
        .select('time_spent_minutes')
        .eq('user_id', user.id);

      const totalHours = Math.round(
        (timeData?.reduce((sum, t) => sum + (t.time_spent_minutes ?? 0), 0) ?? 0) / 60
      );

      // Calculate topic breakdown from enrolled courses
      const topicCounts: Record<string, number> = {};
      let totalEnrolled = 0;
      progressData?.forEach(p => {
        const category = (p.courses as any)?.category || 'Other';
        topicCounts[category] = (topicCounts[category] || 0) + 1;
        totalEnrolled++;
      });

      const topics = Object.entries(topicCounts)
        .map(([name, count]) => ({
          name,
          percentage: totalEnrolled > 0 ? Math.round((count / totalEnrolled) * 100) : 0,
        }))
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 4);

      return {
        stats: {
          ongoing,
          completed,
          certificates: certificateCount ?? 0,
          hoursSpent: totalHours,
        },
        topics,
        totalCourses: totalEnrolled,
      };
    },
    enabled: !!user,
  });
}

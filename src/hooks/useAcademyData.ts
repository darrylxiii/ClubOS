import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type AcademyRow = Database['public']['Tables']['academies']['Row'];
type CourseRow = Database['public']['Tables']['courses']['Row'];
type LearningPathRow = Database['public']['Tables']['learning_paths']['Row'];

export interface AcademyCourse extends Omit<CourseRow, 'description'> {
  description?: string | null;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
  progress?: number;
}

export type AcademyData = AcademyRow;
export type LearningPathData = LearningPathRow;

export function useAcademyData(slug: string | undefined, userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['academy', slug, userId],
    queryFn: async () => {
      // Load academy
      const { data: academyData, error: academyError } = await supabase
        .from('academies')
        .select('*')
        .eq('slug', slug || 'quantum-club-academy')
        .single();

      if (academyError) throw academyError;

      // Load courses
      const coursesQuery = supabase
        .from('courses')
        .select(`*, profiles:created_by(full_name, avatar_url)`)
        .eq('academy_id', academyData.id)
        .order('display_order');

      let courses: AcademyCourse[];
      if (userId) {
        const { data } = await coursesQuery.or(`is_published.eq.true,created_by.eq.${userId}`);
        courses = (data || []) as AcademyCourse[];
      } else {
        const { data } = await coursesQuery.eq('is_published', true);
        courses = (data || []) as AcademyCourse[];
      }

      // Load learning paths
      const { data: pathsData } = await supabase
        .from('learning_paths')
        .select('*')
        .eq('academy_id', academyData.id)
        .eq('is_active', true)
        .order('display_order');

      // Check expert status
      let isExpert = false;
      if (userId) {
        const { data: expertData } = await supabase
          .from('expert_profiles')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();
        isExpert = !!expertData;

        // Fetch progress
        const { data: progressData } = await supabase
          .from('learner_progress')
          .select(`progress_percentage, modules(course_id)`)
          .eq('user_id', userId);

        if (progressData) {
          const courseProgress: Record<string, { total: number; count: number }> = {};
          progressData.forEach((p: Record<string, unknown>) => {
            const modules = p.modules as { course_id: string } | null;
            const courseId = modules?.course_id;
            if (courseId) {
              if (!courseProgress[courseId]) courseProgress[courseId] = { total: 0, count: 0 };
              courseProgress[courseId].total += p.progress_percentage as number;
              courseProgress[courseId].count += 1;
            }
          });

          courses = courses.map(course => {
            const moduleData = (course as unknown as Record<string, unknown>).modules as Array<{ count: number }> | undefined;
            const totalModules = moduleData?.[0]?.count || 1;
            const progressInfo = courseProgress[course.id];
            if (progressInfo) {
              const progress = Math.round(progressInfo.total / (totalModules as number));
              return { ...course, progress, enrolled_count: course.enrolled_count || 1 };
            }
            return course;
          });
        }
      }

      return {
        academy: academyData as AcademyData,
        courses,
        learningPaths: (pathsData || []) as LearningPathData[],
        isExpert,
      };
    },
    enabled: true,
    staleTime: 60_000,
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['academy', slug, userId] });
  };

  return {
    academy: query.data?.academy ?? null,
    courses: query.data?.courses ?? [],
    learningPaths: query.data?.learningPaths ?? [],
    isExpert: query.data?.isExpert ?? false,
    loading: query.isLoading,
    refetch,
  };
}

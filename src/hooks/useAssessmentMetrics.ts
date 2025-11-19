import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AssessmentMetrics {
  total_completed: number;
  in_progress: number;
  pending: number;
  average_score: number;
  pass_rate: number;
  new_this_week: number;
}

export const useAssessmentMetrics = () => {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['assessment-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_assessment_metrics');
      if (error) throw error;
      return data as any as AssessmentMetrics;
    },
    refetchInterval: 60000,
  });

  return {
    metrics,
    isLoading,
  };
};

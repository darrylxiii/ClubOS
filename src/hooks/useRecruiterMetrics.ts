import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RecruiterMetrics {
  total_candidates_added: number;
  total_candidates_placed: number;
  total_candidates_outreached: number;
  total_candidates_spoken: number;
  total_client_calls: number;
  total_candidate_calls: number;
  total_sourcing_hours: number;
  total_placement_revenue: number;
  days_active: number;
}

export interface DailyMetrics {
  date: string;
  candidates_added: number;
  candidates_placed: number;
  candidates_outreached: number;
  candidates_spoken: number;
  client_calls: number;
  candidate_calls: number;
}

export const useRecruiterMetrics = (userId?: string, days = 30) => {
  const { data: aggregateStats, isLoading: statsLoading } = useQuery({
    queryKey: ['recruiter-stats', userId, days],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase.rpc('get_recruiter_stats', {
        p_user_id: userId,
        p_days: days,
      });
      
      if (error) throw error;
      return data as unknown as RecruiterMetrics;
    },
    enabled: !!userId,
  });

  const { data: dailyMetrics, isLoading: dailyLoading } = useQuery({
    queryKey: ['recruiter-daily-metrics', userId, days],
    queryFn: async () => {
      if (!userId) return [];
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('recruiter_activity_metrics')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });
      
      if (error) throw error;
      return data as DailyMetrics[];
    },
    enabled: !!userId,
  });

  // Also get pipeline stats from applications table
  const { data: pipelineStats, isLoading: pipelineLoading } = useQuery({
    queryKey: ['recruiter-pipeline-stats', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('applications')
        .select('status, current_stage_index')
        .eq('sourced_by', userId);
      
      if (error) throw error;
      
      const stats = {
        total_sourced: data?.length || 0,
        in_screening: data?.filter(a => a.current_stage_index === 1).length || 0,
        in_interview: data?.filter(a => a.current_stage_index >= 2 && a.current_stage_index < 4).length || 0,
        in_offer: data?.filter(a => a.current_stage_index === 4).length || 0,
        hired: data?.filter(a => a.status === 'hired').length || 0,
        rejected: data?.filter(a => a.status === 'rejected').length || 0,
      };
      
      return stats;
    },
    enabled: !!userId,
  });

  return {
    aggregateStats,
    dailyMetrics,
    pipelineStats,
    isLoading: statsLoading || dailyLoading || pipelineLoading,
  };
};

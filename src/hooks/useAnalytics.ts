import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { HiringMetrics, RecruiterPerformance, PipelineHealth } from "@/types/analytics";

// Re-export types for backward compatibility
export type { HiringMetrics, RecruiterPerformance, PipelineHealth };

export function useHiringMetrics(companyId: string | undefined) {
  return useQuery<HiringMetrics[]>({
    queryKey: ['hiring-metrics', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await (supabase as any)
        .from('hiring_metrics_weekly')
        .select('*')
        .eq('company_id', companyId)
        .order('week', { ascending: false })
        .limit(26); // Last 26 weeks (6 months)

      if (error) throw error;
      return (data || []) as HiringMetrics[];
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useRecruiterPerformance(companyId: string | undefined) {
  return useQuery<RecruiterPerformance[]>({
    queryKey: ['recruiter-performance', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await (supabase as any)
        .from('recruiter_performance')
        .select('*')
        .eq('company_id', companyId)
        .order('month', { ascending: false })
        .limit(12); // Last 12 months

      if (error) throw error;
      return (data || []) as RecruiterPerformance[];
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePipelineHealth(companyId: string | undefined) {
  return useQuery<PipelineHealth[]>({
    queryKey: ['pipeline-health', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await (supabase as any)
        .from('pipeline_health')
        .select('*')
        .eq('company_id', companyId)
        .order('week', { ascending: false })
        .limit(13); // Last 13 weeks (3 months)

      if (error) throw error;
      return (data || []) as PipelineHealth[];
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRefreshAnalytics() {
  return async () => {
    const { error } = await (supabase as any).rpc('refresh_analytics_views');
    if (error) throw error;
  };
}
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HiringMetrics {
  week: string;
  company_id: string;
  total_applications: number;
  hires: number;
  avg_days_to_hire: number;
  active_jobs: number;
  rejections: number;
  in_progress: number;
  avg_time_to_hire_days: number;
}

export interface RecruiterPerformance {
  user_id: string;
  company_id: string;
  recruiter_name: string;
  total_reviews: number;
  interviews_scheduled: number;
  hires_made: number;
  jobs_managed: number;
  avg_response_time_days: number;
  month: string;
}

export interface PipelineHealth {
  company_id: string;
  status: string;
  candidate_count: number;
  avg_days_in_stage: number;
  week: string;
}

export function useHiringMetrics(companyId: string | undefined) {
  return useQuery({
    queryKey: ['hiring-metrics', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('hiring_metrics_weekly' as any)
        .select('*')
        .eq('company_id', companyId)
        .order('week', { ascending: false })
        .limit(26); // Last 26 weeks (6 months)

      if (error) throw error;
      return (data || []) as any as HiringMetrics[];
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useRecruiterPerformance(companyId: string | undefined) {
  return useQuery({
    queryKey: ['recruiter-performance', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('recruiter_performance' as any)
        .select('*')
        .eq('company_id', companyId)
        .order('month', { ascending: false })
        .limit(12); // Last 12 months

      if (error) throw error;
      return (data || []) as any as RecruiterPerformance[];
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePipelineHealth(companyId: string | undefined) {
  return useQuery({
    queryKey: ['pipeline-health', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('pipeline_health' as any)
        .select('*')
        .eq('company_id', companyId)
        .order('week', { ascending: false })
        .limit(13); // Last 13 weeks (3 months)

      if (error) throw error;
      return (data || []) as any as PipelineHealth[];
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRefreshAnalytics() {
  return async () => {
    const { error } = await supabase.rpc('refresh_analytics_views' as any);
    if (error) throw error;
  };
}
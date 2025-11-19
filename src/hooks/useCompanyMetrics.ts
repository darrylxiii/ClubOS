import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CompanyMetrics {
  total_companies: number;
  active_companies: number;
  inactive_companies: number;
  new_this_month: number;
  total_jobs: number;
  active_jobs: number;
  total_applications: number;
  total_followers: number;
}

interface TopCompany {
  company_id: string;
  company_name: string;
  job_count?: number;
  follower_count?: number;
}

export const useCompanyMetrics = () => {
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['company-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_company_metrics');
      if (error) throw error;
      return data as any as CompanyMetrics;
    },
    refetchInterval: 60000,
  });

  const { data: topByJobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['top-companies-by-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_top_companies_by_jobs', { limit_count: 5 });
      if (error) throw error;
      return data as any as TopCompany[];
    },
    refetchInterval: 300000,
  });

  const { data: topByFollowers, isLoading: followersLoading } = useQuery({
    queryKey: ['top-companies-by-followers'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_top_companies_by_followers', { limit_count: 5 });
      if (error) throw error;
      return data as any as TopCompany[];
    },
    refetchInterval: 300000,
  });

  return {
    metrics,
    topByJobs,
    topByFollowers,
    isLoading: metricsLoading || jobsLoading || followersLoading,
  };
};

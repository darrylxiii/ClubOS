import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ApplicationMetrics {
  total_applications: number;
  pending_review: number;
  approved: number;
  rejected: number;
  new_today: number;
  critical_pending: number;
  approval_rate: number;
}

export const useApplicationMetrics = () => {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['application-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_application_metrics');
      if (error) throw error;
      return data as any as ApplicationMetrics;
    },
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
    staleTime: 30000,
  });

  return {
    metrics,
    isLoading,
  };
};

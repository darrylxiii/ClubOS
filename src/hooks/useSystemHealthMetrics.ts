import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SystemHealthMetrics {
  platform_status: string;
  uptime_percentage: number;
  total_errors_24h: number;
  critical_errors: number;
  warnings: number;
  avg_response_time_ms: number;
  last_backup: string;
}

export const useSystemHealthMetrics = () => {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['system-health-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_system_health_metrics');
      if (error) throw error;
      return data as any as SystemHealthMetrics;
    },
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    staleTime: 15000,
  });

  return {
    metrics,
    isLoading,
  };
};

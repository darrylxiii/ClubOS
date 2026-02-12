import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SystemHealthData {
  platform_status: string;
  active_users_1h: number;
  total_errors_1h: number;
  critical_errors_1h: number;
  avg_response_time_ms: number;
  db_connections: number;
}

interface EdgeFunctionHealth {
  function_name: string;
  total_calls: number;
  success_count: number;
  error_count: number;
  success_rate: number;
  avg_duration_ms: number;
}

export const useSystemHealth = () => {
  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_realtime_system_health');
      if (error) {
        console.warn('System health check failed:', error.message);
        // Return safe defaults on error
        return {
          platform_status: 'unknown',
          active_users_1h: 0,
          total_errors_1h: 0,
          critical_errors_1h: 0,
          avg_response_time_ms: 0,
          db_connections: 0,
        } as SystemHealthData;
      }
      // Function now returns JSON directly
      return data as unknown as SystemHealthData;
    },
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
    staleTime: 30000,
    retry: false, // Don't retry on failure to avoid log spam
  });

  const { data: functions, isLoading: functionsLoading } = useQuery({
    queryKey: ['edge-function-health'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_edge_function_health');
      if (error) throw error;
      return data as EdgeFunctionHealth[];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  return {
    health,
    functions,
    isLoading: healthLoading || functionsLoading,
    refetch: refetchHealth,
  };
};

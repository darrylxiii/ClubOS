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
      if (error) throw error;
      return data as unknown as SystemHealthData;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
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

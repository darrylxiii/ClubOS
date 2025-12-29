import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

interface PlatformMetrics {
  total_members: number;
  success_rate: number;
  avg_response_time_hours: number;
  avg_package_euros: number;
  total_applications: number;
  total_hires: number;
  total_jobs: number;
}

export function usePlatformMetrics() {
  return useQuery<PlatformMetrics>({
    queryKey: ['platform-metrics'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('platform_metrics')
        .select('*')
        .order('metric_date', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // Fallback to reasonable defaults if no metrics exist yet
        logger.warn('Platform metrics not found, using defaults', { componentName: 'usePlatformMetrics', error });
        return {
          total_members: 1200,
          success_rate: 92,
          avg_response_time_hours: 48,
          avg_package_euros: 180000,
          total_applications: 0,
          total_hires: 0,
          total_jobs: 0,
        };
      }

      return data as PlatformMetrics;
    },
    staleTime: 1000 * 60 * 60, // 1 hour - metrics update daily
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

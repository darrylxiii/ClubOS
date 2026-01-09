import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface KPIHistoryPoint {
  id: string;
  kpi_name: string;
  category: string;
  domain: string;
  value: number;
  target_value: number | null;
  trend: number | null;
  status: string | null;
  recorded_at: string;
}

export function useKPIHistory(kpiName: string, domain: string, days: number = 30) {
  return useQuery({
    queryKey: ['kpi-history', kpiName, domain, days],
    queryFn: async () => {
      // Guard against empty/invalid inputs
      if (!kpiName || !domain) {
        return [] as KPIHistoryPoint[];
      }
      
      try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data, error } = await supabase
          .from('kpi_history')
          .select('*')
          .eq('kpi_name', kpiName)
          .eq('domain', domain)
          .gte('recorded_at', startDate.toISOString())
          .order('recorded_at', { ascending: true });

        if (error) {
          console.error('KPI History fetch error:', error);
          return [] as KPIHistoryPoint[];
        }
        return (data || []) as KPIHistoryPoint[];
      } catch (err) {
        console.error('KPI History unexpected error:', err);
        return [] as KPIHistoryPoint[];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Only retry once on failure
  });
}

export function useKPIHistoryBulk(kpiNames: string[], domain: string, days: number = 30) {
  return useQuery({
    queryKey: ['kpi-history-bulk', kpiNames.join(','), domain, days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('kpi_history')
        .select('*')
        .in('kpi_name', kpiNames)
        .eq('domain', domain)
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: true });

      if (error) throw error;

      // Group by KPI name
      const grouped: Record<string, KPIHistoryPoint[]> = {};
      data?.forEach(point => {
        if (!grouped[point.kpi_name]) {
          grouped[point.kpi_name] = [];
        }
        grouped[point.kpi_name].push(point as KPIHistoryPoint);
      });

      return grouped;
    },
    enabled: kpiNames.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

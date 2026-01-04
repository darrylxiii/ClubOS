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
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('kpi_history')
        .select('*')
        .eq('kpi_name', kpiName)
        .eq('domain', domain)
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: true });

      if (error) throw error;
      return data as KPIHistoryPoint[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
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

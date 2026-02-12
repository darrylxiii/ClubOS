import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DailyStat {
  id: string;
  function_name: string;
  date: string;
  invocation_count: number;
  success_count: number;
  error_count: number;
  avg_response_time_ms: number;
  total_tokens_used: number;
  created_at: string;
}

export function useEdgeFunctionDailyStats(days: number = 30, functionName?: string) {
  return useQuery({
    queryKey: ['edge-function-daily-stats', days, functionName],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let query = supabase
        .from('edge_function_daily_stats')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (functionName) {
        query = query.eq('function_name', functionName);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as DailyStat[];
    },
    staleTime: 60000,
    refetchInterval: 120000,
    refetchIntervalInBackground: false,
  });
}

export function useEdgeFunctionUsageSummary(days: number = 7) {
  return useQuery({
    queryKey: ['edge-function-usage-summary', days],
    queryFn: async () => {
      // Pull from ai_usage_logs for recent live data
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('ai_usage_logs')
        .select('function_name, success, response_time_ms, tokens_used, created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      const byFunction: Record<string, {
        function_name: string;
        total: number;
        successes: number;
        errors: number;
        totalTime: number;
        totalTokens: number;
      }> = {};

      const byDay: Record<string, { date: string; invocations: number; errors: number }> = {};

      (data || []).forEach(log => {
        const fn = log.function_name || 'unknown';
        if (!byFunction[fn]) {
          byFunction[fn] = { function_name: fn, total: 0, successes: 0, errors: 0, totalTime: 0, totalTokens: 0 };
        }
        byFunction[fn].total++;
        if (log.success) byFunction[fn].successes++;
        else byFunction[fn].errors++;
        byFunction[fn].totalTime += log.response_time_ms || 0;
        byFunction[fn].totalTokens += log.tokens_used || 0;

        const day = (log.created_at || '').split('T')[0];
        if (day) {
          if (!byDay[day]) byDay[day] = { date: day, invocations: 0, errors: 0 };
          byDay[day].invocations++;
          if (!log.success) byDay[day].errors++;
        }
      });

      const topFunctions = Object.values(byFunction)
        .map(f => ({
          ...f,
          avgResponseTime: f.total > 0 ? Math.round(f.totalTime / f.total) : 0,
          successRate: f.total > 0 ? Math.round((f.successes / f.total) * 100) : 100,
        }))
        .sort((a, b) => b.total - a.total);

      const dailyTrend = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));

      return { topFunctions, dailyTrend, totalLogs: data?.length || 0 };
    },
    staleTime: 60000,
    refetchInterval: 120000,
    refetchIntervalInBackground: false,
  });
}

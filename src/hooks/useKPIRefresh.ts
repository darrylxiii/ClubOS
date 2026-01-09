import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type KPIDomain = 'operations' | 'sales' | 'website' | 'financial';

export interface KPIRefreshResult {
  function_name: string;
  success: boolean;
  metrics_count?: number;
  error?: string;
  duration_ms: number;
}

export interface KPIRefreshSummary {
  success: boolean;
  total_duration_ms: number;
  functions_called: number;
  success_count: number;
  fail_count: number;
  total_metrics_calculated: number;
  results: KPIRefreshResult[];
}

export interface UseKPIRefreshReturn {
  isRefreshing: boolean;
  lastRefresh: Date | null;
  refreshAll: () => Promise<KPIRefreshSummary | null>;
  refreshDomains: (domains: KPIDomain[]) => Promise<KPIRefreshSummary | null>;
  refreshSingleDomain: (domain: KPIDomain) => Promise<KPIRefreshSummary | null>;
  lastResult: KPIRefreshSummary | null;
}

export function useKPIRefresh(): UseKPIRefreshReturn {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [lastResult, setLastResult] = useState<KPIRefreshSummary | null>(null);

  const callScheduler = useCallback(async (
    fullRecalc: boolean = false,
    domains: KPIDomain[] = ['operations', 'sales', 'website', 'financial']
  ): Promise<KPIRefreshSummary | null> => {
    setIsRefreshing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('kpi-scheduler', {
        body: {
          full_recalc: fullRecalc,
          domains,
          period: 'daily',
        },
      });

      if (error) {
        console.error('KPI Scheduler error:', error);
        toast.error(`Failed to calculate KPIs: ${error.message}`);
        return null;
      }

      const result = data as KPIRefreshSummary;
      setLastResult(result);
      setLastRefresh(new Date());

      if (result.success) {
        toast.success(
          `KPIs calculated: ${result.total_metrics_calculated} metrics in ${(result.total_duration_ms / 1000).toFixed(1)}s`
        );
      } else {
        const failedFunctions = result.results
          .filter(r => !r.success)
          .map(r => r.function_name)
          .join(', ');
        toast.warning(`Some KPI calculations failed: ${failedFunctions}`);
      }

      return result;
    } catch (err) {
      console.error('KPI refresh error:', err);
      toast.error('Failed to refresh KPIs');
      return null;
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    return callScheduler(true);
  }, [callScheduler]);

  const refreshDomains = useCallback(async (domains: KPIDomain[]) => {
    return callScheduler(false, domains);
  }, [callScheduler]);

  const refreshSingleDomain = useCallback(async (domain: KPIDomain) => {
    return callScheduler(false, [domain]);
  }, [callScheduler]);

  return {
    isRefreshing,
    lastRefresh,
    refreshAll,
    refreshDomains,
    refreshSingleDomain,
    lastResult,
  };
}

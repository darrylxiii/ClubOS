import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, subMonths, format } from 'date-fns';

export interface RevenueTickerData {
  mrr: number;
  mrrDelta: number | null;
  placements: number;
  placementsDelta: number | null;
  activeJobs: number;
}

export function useRevenueTickerData() {
  return useQuery({
    queryKey: ['revenue-ticker-data'],
    queryFn: async (): Promise<RevenueTickerData> => {
      const now = new Date();
      const currentMonthStart = format(startOfMonth(now), 'yyyy-MM-dd');
      const prevMonthStart = format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');

      // Run all queries in parallel
      const [currentFees, prevFees, activeJobsResult] = await Promise.all([
        // Current month placement fees
        supabase
          .from('placement_fees')
          .select('fee_amount')
          .gte('hired_date', currentMonthStart)
          .neq('status', 'cancelled'),

        // Previous month placement fees
        supabase
          .from('placement_fees')
          .select('fee_amount')
          .gte('hired_date', prevMonthStart)
          .lt('hired_date', currentMonthStart)
          .neq('status', 'cancelled'),

        // Active jobs count
        supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'published'),
      ]);

      if (currentFees.error) throw currentFees.error;
      if (prevFees.error) throw prevFees.error;
      if (activeJobsResult.error) throw activeJobsResult.error;

      const currentMrr = (currentFees.data || []).reduce((sum, f) => sum + (f.fee_amount || 0), 0);
      const currentPlacements = (currentFees.data || []).length;
      const prevMrr = (prevFees.data || []).reduce((sum, f) => sum + (f.fee_amount || 0), 0);
      const prevPlacements = (prevFees.data || []).length;

      const mrrDelta = prevMrr > 0
        ? Math.round(((currentMrr - prevMrr) / prevMrr) * 100)
        : null;

      const placementsDelta = prevPlacements > 0
        ? Math.round(((currentPlacements - prevPlacements) / prevPlacements) * 100)
        : null;

      return {
        mrr: currentMrr,
        mrrDelta,
        placements: currentPlacements,
        placementsDelta,
        activeJobs: activeJobsResult.count ?? 0,
      };
    },
    staleTime: 30000,
  });
}

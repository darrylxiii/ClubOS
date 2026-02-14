import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CostHistoryPoint {
  month: string;
  totalMRC: number;
  subscriptionCount: number;
}

/**
 * Fetches real MRC trend data from subscription_cost_history,
 * grouped by month for the given year.
 */
export function useSubscriptionCostHistory(year: number) {
  return useQuery({
    queryKey: ['subscription-cost-history', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_cost_history')
        .select('subscription_id, monthly_cost, recorded_at')
        .gte('recorded_at', `${year}-01-01`)
        .lte('recorded_at', `${year}-12-31`)
        .order('recorded_at', { ascending: true });

      if (error) throw error;

      // Group by month - for each month, take the latest snapshot per subscription
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];

      const byMonthSub = new Map<string, Map<string, number>>();

      (data || []).forEach((row) => {
        const monthIdx = new Date(row.recorded_at).getMonth();
        const key = months[monthIdx];
        if (!byMonthSub.has(key)) byMonthSub.set(key, new Map());
        // Latest entry per subscription per month wins
        byMonthSub.get(key)!.set(row.subscription_id, Number(row.monthly_cost));
      });

      const result: CostHistoryPoint[] = months.map((month) => {
        const subs = byMonthSub.get(month);
        if (!subs || subs.size === 0) {
          return { month, totalMRC: 0, subscriptionCount: 0 };
        }
        let total = 0;
        subs.forEach((cost) => (total += cost));
        return { month, totalMRC: Math.round(total), subscriptionCount: subs.size };
      });

      return result;
    },
    staleTime: 120_000,
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RevenueLadder {
  id: string;
  name: string;
  description: string | null;
  track_type: string;
  revenue_definition: string;
  fiscal_year_start: number;
  is_active: boolean;
  safety_config: Record<string, unknown>;
  created_at: string;
  revenue_milestones?: RevenueMilestone[];
}

export interface RevenueMilestone {
  id: string;
  ladder_id: string;
  threshold_amount: number;
  display_name: string;
  description: string | null;
  status: string;
  progress_percentage: number;
  achieved_revenue: number;
  unlocked_at: string | null;
  rewarded_at: string | null;
  fiscal_year: number | null;
  default_category: string | null;
  suggested_reward_range: Record<string, unknown>;
  display_order: number;
  created_at: string;
}

export interface RevenueStats {
  annual: {
    booked: number;
    collected: number;
    year: number;
  };
  lifetime: {
    booked: number;
    collected: number;
    yearsTracked: number;
  };
  source: string;
  lastSync: string | null;
}

export function useRevenueLadders() {
  return useQuery({
    queryKey: ['revenue-ladders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('revenue_ladders')
        .select(`*, revenue_milestones (*)`)
        .eq('is_active', true)
        .order('track_type');

      if (error) throw error;
      
      return (data || []).map(ladder => ({
        ...ladder,
        revenue_milestones: (ladder.revenue_milestones || []).sort(
          (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
        )
      })) as RevenueLadder[];
    }
  });
}

export function useRevenueMilestones(ladderId?: string) {
  return useQuery({
    queryKey: ['revenue-milestones', ladderId],
    queryFn: async () => {
      let query = supabase.from('revenue_milestones').select('*').order('display_order');
      if (ladderId) query = query.eq('ladder_id', ladderId);
      const { data, error } = await query;
      if (error) throw error;
      return data as RevenueMilestone[];
    }
  });
}

/**
 * Fetches real revenue stats directly from Moneybird financial metrics
 * Returns annual (current year) and lifetime revenue with both booked and collected amounts
 * All amounts are NET (excluding 21% Dutch VAT)
 */
export function useRevenueStats() {
  return useQuery({
    queryKey: ['revenue-stats'],
    queryFn: async (): Promise<RevenueStats> => {
      // Fetch all Moneybird metrics (all years)
      const { data: moneybirdMetrics, error } = await supabase
        .from('moneybird_financial_metrics')
        .select('period_start, total_revenue, total_paid, last_synced_at')
        .order('period_start', { ascending: true });

      if (error) throw error;

      const currentYear = new Date().getFullYear();
      
      // Deduplicate by year (keep latest synced record per year) - safety net
      const uniqueByYear = (moneybirdMetrics || []).reduce((acc, m) => {
        const year = m.period_start?.substring(0, 4);
        if (year && (!acc[year] || (m.last_synced_at || '') > (acc[year].last_synced_at || ''))) {
          acc[year] = m;
        }
        return acc;
      }, {} as Record<string, typeof moneybirdMetrics[0]>);
      
      const dedupedMetrics = Object.values(uniqueByYear);
      
      // Calculate lifetime totals from deduplicated Moneybird years
      let lifetimeBooked = 0;
      let lifetimeCollected = 0;
      
      dedupedMetrics.forEach(m => {
        lifetimeBooked += Number(m.total_revenue) || 0;
        lifetimeCollected += Number(m.total_paid) || 0;
      });

      // Get current year data
      const currentYearData = uniqueByYear[String(currentYear)];

      // Get last sync date
      const lastSync = dedupedMetrics.length > 0 
        ? dedupedMetrics.reduce((latest, m) => 
            (m.last_synced_at || '') > (latest || '') ? m.last_synced_at : latest, 
            null as string | null
          )
        : null;

      return {
        annual: {
          booked: Number(currentYearData?.total_revenue) || 0,
          collected: Number(currentYearData?.total_paid) || 0,
          year: currentYear,
        },
        lifetime: {
          booked: lifetimeBooked,
          collected: lifetimeCollected,
          yearsTracked: dedupedMetrics.length,
        },
        source: 'moneybird',
        lastSync,
      };
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

export function useCalculateRevenueMilestones() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('calculate-revenue-milestones');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['revenue-ladders'] });
      queryClient.invalidateQueries({ queryKey: ['revenue-milestones'] });
      queryClient.invalidateQueries({ queryKey: ['revenue-stats'] });
      if (data?.unlocks > 0) {
        toast.success(`🎉 ${data.unlocks} milestone(s) unlocked!`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });
}

export function useMilestoneStats() {
  const { data: ladders } = useRevenueLadders();

  const stats = {
    totalMilestones: 0,
    unlockedMilestones: 0,
    rewardedMilestones: 0,
    approachingMilestones: 0,
    nextMilestone: null as RevenueMilestone | null,
    annualRevenue: 0,
    lifetimeRevenue: 0,
  };

  if (ladders) {
    for (const ladder of ladders) {
      for (const milestone of ladder.revenue_milestones || []) {
        stats.totalMilestones++;
        if (milestone.status === 'unlocked') stats.unlockedMilestones++;
        if (milestone.status === 'rewarded') stats.rewardedMilestones++;
        if (milestone.status === 'approaching') stats.approachingMilestones++;
        
        if ((milestone.status === 'locked' || milestone.status === 'approaching') &&
            (!stats.nextMilestone || milestone.threshold_amount < stats.nextMilestone.threshold_amount)) {
          stats.nextMilestone = milestone;
        }

        if (ladder.track_type === 'annual') {
          stats.annualRevenue = Math.max(stats.annualRevenue, milestone.achieved_revenue || 0);
        } else {
          stats.lifetimeRevenue = Math.max(stats.lifetimeRevenue, milestone.achieved_revenue || 0);
        }
      }
    }
  }

  return stats;
}

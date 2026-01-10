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
          (a, b) => a.display_order - b.display_order
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

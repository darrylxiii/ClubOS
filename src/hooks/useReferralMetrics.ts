import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ReferralMetrics {
  totalReferrals: number;
  successfulReferrals: number;
  pendingRewards: number;
  paidOutRewards: number;
  activeReferrers: number;
  conversionRate: number;
  topReferrers: {
    id: string;
    name: string;
    count: number;
  }[];
  trend: number;
}

export function useReferralMetrics() {
  return useQuery({
    queryKey: ['referral-metrics'],
    queryFn: async (): Promise<ReferralMetrics> => {
      // Get user referral stats for aggregated data
      const { data: stats, error: statsError } = await supabase
        .from('user_referral_stats')
        .select('user_id, total_referrals, successful_placements, total_earned');

      if (statsError) {
        console.error('Error fetching referral stats:', statsError);
        return {
          totalReferrals: 0,
          successfulReferrals: 0,
          pendingRewards: 0,
          paidOutRewards: 0,
          activeReferrers: 0,
          conversionRate: 0,
          topReferrers: [],
          trend: 0,
        };
      }

      // Get referral earnings for payment details
      const { data: earnings } = await supabase
        .from('referral_earnings')
        .select('referrer_id, earned_amount, projected_amount, status, paid_at');

      // Calculate totals from stats
      const totalReferrals = stats?.reduce((sum, s) => sum + (s.total_referrals || 0), 0) || 0;
      const successfulReferrals = stats?.reduce((sum, s) => sum + (s.successful_placements || 0), 0) || 0;
      
      // Calculate rewards from earnings
      const paidOutRewards = earnings
        ?.filter(e => e.status === 'paid' || e.paid_at)
        .reduce((sum, e) => sum + (e.earned_amount || 0), 0) || 0;
      
      const pendingRewards = earnings
        ?.filter(e => e.status === 'qualified' && !e.paid_at)
        .reduce((sum, e) => sum + (e.earned_amount || 0), 0) || 0;

      // Count active referrers
      const activeReferrers = stats?.filter(s => (s.total_referrals || 0) > 0).length || 0;

      // Conversion rate
      const conversionRate = totalReferrals > 0 
        ? (successfulReferrals / totalReferrals) * 100 
        : 0;

      // Top referrers by total referrals
      const sortedStats = [...(stats || [])].sort((a, b) => 
        (b.total_referrals || 0) - (a.total_referrals || 0)
      ).slice(0, 3);

      // Fetch referrer names
      const topReferrers = await Promise.all(
        sortedStats.map(async (stat) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', stat.user_id)
            .single();
          return {
            id: stat.user_id,
            name: profile?.full_name || 'Unknown',
            count: stat.total_referrals || 0,
          };
        })
      );

      return {
        totalReferrals,
        successfulReferrals,
        pendingRewards,
        paidOutRewards,
        activeReferrers,
        conversionRate: Math.round(conversionRate * 10) / 10,
        topReferrers,
        trend: 0, // Would need historical comparison
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

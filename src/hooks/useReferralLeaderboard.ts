import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LeaderboardPeriod = 'week' | 'month' | 'year' | 'all_time';

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_earned: number;
  total_referred: number;
  successful_placements: number;
  success_rate: number;
  rank_position: number;
  is_anonymous: boolean;
}

export interface UserTier {
  tier_id: string;
  tier_name: string;
  tier_level: number;
  bonus_percentage: number;
  perks: string[];
  badge_color: string;
  badge_icon: string;
  placements_to_next: number;
  next_tier_name: string | null;
  progress_percentage: number;
}

export interface ReferralChallenge {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  start_date: string;
  end_date: string;
  reward_pool: number;
  bonus_percentage: number;
  winner_count: number;
  participants_count: number;
  time_remaining: string;
  user_rank: number | null;
  user_progress: {
    referrals: number;
    placements: number;
    earnings: number;
  } | null;
}

export function useReferralLeaderboard(period: LeaderboardPeriod = 'all_time') {
  return useQuery({
    queryKey: ['referral-leaderboard', period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('calculate_referral_rankings', {
        p_period: period
      });
      
      if (error) throw error;
      return (data || []) as LeaderboardEntry[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useUserReferralTier(userId?: string) {
  return useQuery({
    queryKey: ['user-referral-tier', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase.rpc('get_user_referral_tier', {
        p_user_id: userId
      });
      
      if (error) throw error;
      if (!data || data.length === 0) return null;
      
      const tier = data[0];
      return {
        ...tier,
        perks: typeof tier.perks === 'string' ? JSON.parse(tier.perks) : tier.perks
      } as UserTier;
    },
    enabled: !!userId,
  });
}

export function useReferralChallenges() {
  return useQuery({
    queryKey: ['referral-challenges'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_active_referral_challenges');
      
      if (error) throw error;
      return (data || []) as ReferralChallenge[];
    },
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useReferralActivityFeed() {
  return useQuery({
    queryKey: ['referral-activity-feed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_activity_feed')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useAllReferralTiers() {
  return useQuery({
    queryKey: ['referral-tiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_tiers')
        .select('*')
        .order('tier_level', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });
}

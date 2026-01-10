import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PersonalContribution {
  milestoneId: string;
  milestoneName: string;
  milestoneStatus: string;
  revenueAttributed: number;
  contributionType: string;
  contributionRole: string;
  placementCount: number;
  attributedAt: string;
}

export interface CommissionTierInfo {
  tierId: string;
  tierName: string;
  minRevenue: number;
  maxRevenue: number | null;
  percentage: number;
  isCurrentTier: boolean;
  nextTier?: {
    name: string;
    minRevenue: number;
    percentage: number;
    revenueNeeded: number;
  };
}

export interface PersonalContributionStats {
  totalRevenueSourced: number;
  totalRevenueClosed: number;
  totalRevenue: number;
  placementCount: number;
  milestonesContributed: number;
  commissionEarned: number;
  projectedCommission: number;
  targetProgress: number;
  annualTarget: number;
  contributions: PersonalContribution[];
  commissionTier: CommissionTierInfo | null;
  rank: number;
  teamSize: number;
}

export const useMyContributions = (year?: number) => {
  const { user } = useAuth();
  const targetYear = year || new Date().getFullYear();

  return useQuery({
    queryKey: ['my-contributions', user?.id, targetYear],
    queryFn: async (): Promise<PersonalContributionStats> => {
      if (!user?.id) throw new Error('User not authenticated');

      const yearStart = `${targetYear}-01-01`;
      const yearEnd = `${targetYear + 1}-01-01`;

      // Fetch all data in parallel
      const [
        placementsResult,
        contributionsResult,
        commissionsResult,
        tiersResult,
        employeeResult,
        teamResult,
        referralResult,
      ] = await Promise.all([
        // Personal placements (sourced + closed)
        supabase
          .from('placement_fees')
          .select('id, fee_amount, sourced_by, closed_by, hired_date, cash_flow_status')
          .gte('hired_date', yearStart)
          .lt('hired_date', yearEnd)
          .or(`sourced_by.eq.${user.id},closed_by.eq.${user.id}`),

        // Milestone contributions (filtered by year for performance)
        supabase
          .from('milestone_contributions')
          .select(`
            id,
            milestone_id,
            revenue_attributed,
            contribution_type,
            contribution_role,
            source_entity_id,
            attributed_at,
            revenue_milestones (
              display_name,
              status
            )
          `)
          .eq('user_id', user.id)
          .gte('attributed_at', yearStart)
          .lt('attributed_at', yearEnd),

        // Commission earnings
        supabase
          .from('employee_commissions')
          .select('id, net_amount, source_type, created_at, status')
          .eq('employee_id', user.id)
          .gte('created_at', yearStart)
          .lt('created_at', yearEnd),

        // Commission tiers
        supabase
          .from('commission_tiers')
          .select('id, name, min_revenue, max_revenue, percentage, is_active')
          .eq('is_active', true)
          .order('min_revenue', { ascending: true }),

        // Employee profile for target
        supabase
          .from('employee_profiles')
          .select('annual_target, commission_tier_id')
          .eq('user_id', user.id)
          .maybeSingle(),

        // Team placements for rank calculation
        supabase
          .from('placement_fees')
          .select('sourced_by, closed_by, fee_amount')
          .gte('hired_date', yearStart)
          .lt('hired_date', yearEnd),

        // Referral earnings
        supabase
          .from('referral_earnings')
          .select('earned_amount, status')
          .eq('referrer_id', user.id)
          .in('status', ['paid', 'pending_payment']),
      ]);

      // Calculate sourced vs closed revenue
      let revenueSourced = 0;
      let revenueClosed = 0;
      const placements = placementsResult.data || [];
      
      placements.forEach(p => {
        const amount = Number(p.fee_amount) || 0;
        if (p.sourced_by === user.id && p.closed_by === user.id) {
          // Full credit if both
          revenueSourced += amount * 0.5;
          revenueClosed += amount * 0.5;
        } else if (p.sourced_by === user.id) {
          revenueSourced += amount;
        } else if (p.closed_by === user.id) {
          revenueClosed += amount;
        }
      });

      const totalRevenue = revenueSourced + revenueClosed;

      // Process contributions
      const contributions: PersonalContribution[] = (contributionsResult.data || []).map(c => ({
        milestoneId: c.milestone_id,
        milestoneName: (c.revenue_milestones as any)?.display_name || 'Unknown',
        milestoneStatus: (c.revenue_milestones as any)?.status || 'unknown',
        revenueAttributed: c.revenue_attributed || 0,
        contributionType: c.contribution_type,
        contributionRole: c.contribution_role || 'owner',
        placementCount: 1,
        attributedAt: c.attributed_at || '',
      }));

      // Commission earned (paid only)
      const commissionEarned = (commissionsResult.data || [])
        .filter((c: any) => c.status === 'paid')
        .reduce((sum: number, c: any) => sum + (Number(c.net_amount) || 0), 0);

      // Projected commission (pending)
      const projectedCommission = (commissionsResult.data || [])
        .filter((c: any) => c.status === 'pending')
        .reduce((sum: number, c: any) => sum + (Number(c.net_amount) || 0), 0);

      // Referral earnings
      const referralEarnings = (referralResult.data || [])
        .reduce((sum, r) => sum + (Number(r.earned_amount) || 0), 0);

      // Annual target
      const annualTarget = Number(employeeResult.data?.annual_target) || 0;
      const targetProgress = annualTarget > 0 ? (totalRevenue / annualTarget) * 100 : 0;

      // Commission tier calculation
      const tiers = (tiersResult.data || []).sort((a, b) => 
        (Number(a.min_revenue) || 0) - (Number(b.min_revenue) || 0)
      );
      
      let commissionTier: CommissionTierInfo | null = null;
      for (let i = 0; i < tiers.length; i++) {
        const tier = tiers[i];
        const minRev = Number(tier.min_revenue) || 0;
        const maxRev = tier.max_revenue ? Number(tier.max_revenue) : null;
        
        if (totalRevenue >= minRev && (maxRev === null || totalRevenue < maxRev)) {
          const nextTierData = tiers[i + 1];
          commissionTier = {
            tierId: tier.id,
            tierName: tier.name,
            minRevenue: minRev,
            maxRevenue: maxRev,
            percentage: Number(tier.percentage) || 0,
            isCurrentTier: true,
            nextTier: nextTierData ? {
              name: nextTierData.name,
              minRevenue: Number(nextTierData.min_revenue) || 0,
              percentage: Number(nextTierData.percentage) || 0,
              revenueNeeded: (Number(nextTierData.min_revenue) || 0) - totalRevenue,
            } : undefined,
          };
          break;
        }
      }

      // Rank calculation
      const teamRevenue = new Map<string, number>();
      (teamResult.data || []).forEach(p => {
        const amount = Number(p.fee_amount) || 0;
        if (p.sourced_by) {
          teamRevenue.set(p.sourced_by, (teamRevenue.get(p.sourced_by) || 0) + amount * 0.5);
        }
        if (p.closed_by) {
          teamRevenue.set(p.closed_by, (teamRevenue.get(p.closed_by) || 0) + amount * 0.5);
        }
      });

      const sortedTeam = Array.from(teamRevenue.entries()).sort((a, b) => b[1] - a[1]);
      const rank = sortedTeam.findIndex(([id]) => id === user.id) + 1;

      return {
        totalRevenueSourced: Math.round(revenueSourced),
        totalRevenueClosed: Math.round(revenueClosed),
        totalRevenue: Math.round(totalRevenue + referralEarnings),
        placementCount: placements.length,
        milestonesContributed: new Set(contributions.map(c => c.milestoneId)).size,
        commissionEarned: Math.round(commissionEarned + referralEarnings),
        projectedCommission: Math.round(projectedCommission),
        targetProgress: Math.min(targetProgress, 100),
        annualTarget,
        contributions,
        commissionTier,
        rank: rank || sortedTeam.length + 1,
        teamSize: teamRevenue.size,
      };
    },
    enabled: !!user?.id,
  });
};

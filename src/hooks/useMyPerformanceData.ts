import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { EmployeeProfile, EmployeeTarget, EmployeeCommission } from './useEmployeeProfile';
import type { StageBreakdown, PipelineDeal } from './useEmployeePipelineValue';

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

export interface PipelineStats {
  totalSourced: number;
  inScreening: number;
  inInterview: number;
  inOffer: number;
  hired: number;
  rejected: number;
  activeInPipeline: number;
}

export interface MyPerformanceData {
  // Revenue & placements (from placement_fees)
  revenueSourced: number;
  revenueClosed: number;
  totalRevenue: number;
  placementCount: number;
  commissionEarned: number;
  projectedCommission: number;
  commissionTier: CommissionTierInfo | null;
  rank: number;
  teamSize: number;
  targetProgress: number;
  annualTarget: number;

  // Recruiter metrics (from applications)
  candidatesAdded: number;
  candidatesPlaced: number;
  interviewsScheduled: number;
  offersMade: number;
  placementRate: number;
  avgTimeToHire: number;
  pipelineStats: PipelineStats;

  // Employee profile (nullable)
  employeeProfile: EmployeeProfile | null;
  currentTarget: EmployeeTarget | null;
  commissions: EmployeeCommission[];
  hoursThisMonth: number;

  // Pipeline value (from views)
  weightedPipelineValue: number;
  rawPipelineValue: number;
  realizedRevenue: number;
  stageBreakdown: StageBreakdown[];
  topDeals: PipelineDeal[];

  // Gamification
  xp: number;
  level: string;
  streak: number;
  levelProgress: number;
  xpToNextLevel: number;
}

const LEVEL_THRESHOLDS: Record<string, { min: number; max: number }> = {
  Scout: { min: 0, max: 499 },
  Closer: { min: 500, max: 1999 },
  Strategist: { min: 2000, max: 4999 },
  Elite: { min: 5000, max: 14999 },
  Legend: { min: 15000, max: 999999 },
};

export function useMyPerformanceData() {
  const { user } = useAuth();
  const userId = user?.id;
  const year = new Date().getFullYear();
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year + 1}-01-01`;

  return useQuery({
    queryKey: ['my-performance-data', userId, year],
    queryFn: async (): Promise<MyPerformanceData> => {
      if (!userId) throw new Error('Not authenticated');

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Phase 1: Get employee profile first (needed for employee_id-keyed tables)
      const employeeResult = await supabase
        .from('employee_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const employeeId = employeeResult.data?.id || null;

      // Phase 2: All remaining queries in parallel
      const [
        placementsResult,
        teamPlacementsResult,
        applicationsResult,
        commissionsResult,
        tiersResult,
        targetsResult,
        timeResult,
        pipelineSummaryResult,
        pipelineDealsResult,
        gamificationResult,
      ] = await Promise.all([
        // 1. My placements (placement_fees)
        supabase
          .from('placement_fees')
          .select('id, fee_amount, sourced_by, closed_by, hired_date, cash_flow_status')
          .gte('hired_date', yearStart)
          .lt('hired_date', yearEnd)
          .or(`sourced_by.eq.${userId},closed_by.eq.${userId}`),

        // 2. Team placements (for rank calculation)
        supabase
          .from('placement_fees')
          .select('sourced_by, closed_by, fee_amount')
          .gte('hired_date', yearStart)
          .lt('hired_date', yearEnd),

        // 3. Applications I sourced (all time, filter in memory for recent)
        supabase
          .from('applications')
          .select('id, status, current_stage_index, created_at, updated_at')
          .eq('sourced_by', userId),

        // 4. Employee commissions (keyed by employee_profiles.id, not user_id)
        employeeId
          ? supabase
              .from('employee_commissions')
              .select('*')
              .eq('employee_id', employeeId)
              .gte('created_at', yearStart)
              .lt('created_at', yearEnd)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [], error: null }),

        // 5. Commission tiers
        supabase
          .from('commission_tiers')
          .select('id, name, min_revenue, max_revenue, percentage, is_active')
          .eq('is_active', true)
          .order('min_revenue', { ascending: true }),

        // 6. Employee targets (keyed by employee_profiles.id)
        employeeId
          ? supabase
              .from('employee_targets')
              .select('*')
              .eq('employee_id', employeeId)
              .order('period_start', { ascending: false })
          : Promise.resolve({ data: [], error: null }),

        // 7. Time entries this month
        supabase
          .from('time_entries')
          .select('duration_seconds')
          .eq('user_id', userId)
          .gte('start_time', monthStart.toISOString())
          .lte('start_time', monthEnd.toISOString()),

        // 8. Pipeline summary (view, keyed by user_id)
        supabase
          .from('employee_earnings_summary')
          .select('*')
          .eq('employee_id', userId)
          .maybeSingle(),

        // 9. Pipeline top deals (view, keyed by user_id)
        supabase
          .from('employee_pipeline_value')
          .select('*')
          .eq('employee_id', userId)
          .order('weighted_value', { ascending: false })
          .limit(5),

        // 10. Gamification
        supabase
          .from('employee_gamification')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
      ]);

      // --- Revenue & Placements ---
      const placements = placementsResult.data || [];
      let revenueSourced = 0;
      let revenueClosed = 0;

      placements.forEach(p => {
        const amount = Number(p.fee_amount) || 0;
        if (p.sourced_by === userId && p.closed_by === userId) {
          revenueSourced += amount * 0.5;
          revenueClosed += amount * 0.5;
        } else if (p.sourced_by === userId) {
          revenueSourced += amount;
        } else if (p.closed_by === userId) {
          revenueClosed += amount;
        }
      });

      const totalRevenue = revenueSourced + revenueClosed;

      // --- Rank ---
      const teamRevenue = new Map<string, number>();
      (teamPlacementsResult.data || []).forEach(p => {
        const amount = Number(p.fee_amount) || 0;
        if (p.sourced_by) teamRevenue.set(p.sourced_by, (teamRevenue.get(p.sourced_by) || 0) + amount * 0.5);
        if (p.closed_by) teamRevenue.set(p.closed_by, (teamRevenue.get(p.closed_by) || 0) + amount * 0.5);
      });
      const sortedTeam = Array.from(teamRevenue.entries()).sort((a, b) => b[1] - a[1]);
      const rank = (sortedTeam.findIndex(([id]) => id === userId) + 1) || sortedTeam.length + 1;

      // --- Commissions ---
      const commissions = (commissionsResult.data || []) as EmployeeCommission[];
      const commissionEarned = commissions
        .filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + (Number(c.net_amount) || 0), 0);
      const projectedCommission = commissions
        .filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + (Number(c.net_amount) || 0), 0);

      // --- Commission Tier ---
      const tiers = (tiersResult.data || []).sort((a, b) =>
        (Number(a.min_revenue) || 0) - (Number(b.min_revenue) || 0)
      );
      let commissionTier: CommissionTierInfo | null = null;
      for (let i = 0; i < tiers.length; i++) {
        const tier = tiers[i];
        const minRev = Number(tier.min_revenue) || 0;
        const maxRev = tier.max_revenue ? Number(tier.max_revenue) : null;
        if (totalRevenue >= minRev && (maxRev === null || totalRevenue < maxRev)) {
          const next = tiers[i + 1];
          commissionTier = {
            tierId: tier.id,
            tierName: tier.name,
            minRevenue: minRev,
            maxRevenue: maxRev,
            percentage: Number(tier.percentage) || 0,
            isCurrentTier: true,
            nextTier: next ? {
              name: next.name,
              minRevenue: Number(next.min_revenue) || 0,
              percentage: Number(next.percentage) || 0,
              revenueNeeded: (Number(next.min_revenue) || 0) - totalRevenue,
            } : undefined,
          };
          break;
        }
      }

      // --- Employee Profile & Targets ---
      const employeeProfile = (employeeResult.data as EmployeeProfile | null) ?? null;
      const annualTarget = Number(employeeProfile?.annual_bonus_target) || 0;
      const targetProgress = annualTarget > 0 ? Math.min((totalRevenue / annualTarget) * 100, 100) : 0;

      const allTargets = (targetsResult.data || []) as EmployeeTarget[];
      const currentTarget = allTargets.find(t => {
        return new Date(t.period_start) <= now && new Date(t.period_end) >= now;
      }) || null;

      // --- Recruiter Metrics ---
      const allApps = applicationsResult.data || [];
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);
      const recentApps = allApps.filter(a => new Date(a.created_at) >= last30Days);

      const candidatesAdded = recentApps.length;
      const candidatesPlaced = recentApps.filter(a => a.status === 'hired').length;
      const interviewsScheduled = recentApps.filter(a => a.current_stage_index >= 2).length;
      const offersMade = recentApps.filter(a => a.current_stage_index >= 4 || a.status === 'hired').length;
      const placementRate = candidatesAdded > 0 ? Math.round((candidatesPlaced / candidatesAdded) * 100 * 10) / 10 : 0;

      const hiredApps = allApps.filter(a => a.status === 'hired');
      let avgTimeToHire = 0;
      if (hiredApps.length > 0) {
        const totalDays = hiredApps.reduce((sum, app) => {
          const created = new Date(app.created_at);
          const updated = new Date(app.updated_at);
          return sum + (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        }, 0);
        avgTimeToHire = Math.round(totalDays / hiredApps.length);
      }

      const pipelineStats: PipelineStats = {
        totalSourced: allApps.length,
        inScreening: allApps.filter(a => a.current_stage_index === 1 && a.status !== 'rejected').length,
        inInterview: allApps.filter(a => a.current_stage_index >= 2 && a.current_stage_index < 4 && a.status !== 'rejected').length,
        inOffer: allApps.filter(a => a.current_stage_index === 4 && a.status !== 'rejected' && a.status !== 'hired').length,
        hired: allApps.filter(a => a.status === 'hired').length,
        rejected: allApps.filter(a => a.status === 'rejected').length,
        activeInPipeline: allApps.filter(a => !['hired', 'rejected', 'withdrawn'].includes(a.status)).length,
      };

      // --- Hours ---
      const hoursThisMonth = Math.round(
        (timeResult.data || []).reduce((sum, e) => sum + (e.duration_seconds || 0), 0) / 3600
      );

      // --- Pipeline Value ---
      const summary = pipelineSummaryResult.data;
      const stageBreakdown: StageBreakdown[] = [
        { stage: 0, stage_name: 'Applied', count: summary?.stage_0_count || 0, raw_value: 0, weighted_value: summary?.stage_0_value || 0, probability: 0.10 },
        { stage: 1, stage_name: 'Screening', count: summary?.stage_1_count || 0, raw_value: 0, weighted_value: summary?.stage_1_value || 0, probability: 0.25 },
        { stage: 2, stage_name: 'Interview', count: summary?.stage_2_count || 0, raw_value: 0, weighted_value: summary?.stage_2_value || 0, probability: 0.50 },
        { stage: 3, stage_name: 'Offer', count: summary?.stage_3_count || 0, raw_value: 0, weighted_value: summary?.stage_3_value || 0, probability: 0.80 },
        { stage: 4, stage_name: 'Hired', count: summary?.stage_4_count || 0, raw_value: 0, weighted_value: summary?.stage_4_value || 0, probability: 1.00 },
      ];

      const topDeals: PipelineDeal[] = (pipelineDealsResult.data || []).map(d => ({
        application_id: d.application_id,
        candidate_full_name: d.candidate_full_name || 'Unknown',
        job_title: d.job_title || 'Unknown Role',
        company_name: d.company_name || 'Unknown Company',
        stage: d.stage || 0,
        stage_name: d.stage_name || 'Applied',
        potential_fee: Number(d.potential_fee || 0),
        weighted_value: Number(d.weighted_value || 0),
        probability: Number(d.probability || 0.1),
      }));

      // --- Gamification ---
      const gamData = gamificationResult.data;
      const totalXp = gamData?.total_xp || 0;
      const currentLevel = gamData?.current_level || 'Scout';
      const threshold = LEVEL_THRESHOLDS[currentLevel] || LEVEL_THRESHOLDS.Scout;
      const xpInLevel = totalXp - threshold.min;
      const levelRange = threshold.max - threshold.min + 1;
      const levelProgress = Math.min((xpInLevel / levelRange) * 100, 100);
      const xpToNextLevel = Math.max(threshold.max + 1 - totalXp, 0);

      return {
        revenueSourced: Math.round(revenueSourced),
        revenueClosed: Math.round(revenueClosed),
        totalRevenue: Math.round(totalRevenue),
        placementCount: placements.length,
        commissionEarned: Math.round(commissionEarned),
        projectedCommission: Math.round(projectedCommission),
        commissionTier,
        rank,
        teamSize: teamRevenue.size,
        targetProgress,
        annualTarget,

        candidatesAdded,
        candidatesPlaced,
        interviewsScheduled,
        offersMade,
        placementRate,
        avgTimeToHire,
        pipelineStats,

        employeeProfile,
        currentTarget,
        commissions,
        hoursThisMonth,

        weightedPipelineValue: Number(summary?.weighted_pipeline_value || 0),
        rawPipelineValue: Number(summary?.raw_pipeline_value || 0),
        realizedRevenue: Number(summary?.realized_revenue || 0),
        stageBreakdown,
        topDeals,

        xp: totalXp,
        level: currentLevel,
        streak: gamData?.current_streak || 0,
        levelProgress,
        xpToNextLevel,
      };
    },
    enabled: !!userId,
    staleTime: 30000,
  });
}

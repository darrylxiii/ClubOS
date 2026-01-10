import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PipelineForecastData {
  weightedPipeline: number;
  totalPipeline: number;
  dealCount: number;
  avgDealValue: number;
  avgProbability: number;
  projectedMilestones: ProjectedMilestone[];
  velocityMetrics: VelocityMetrics;
}

interface ProjectedMilestone {
  id: string;
  displayName: string;
  threshold: number;
  currentRevenue: number;
  remaining: number;
  projectedUnlockDate: string | null;
  pipelineCoverage: number; // % of remaining covered by pipeline
  confidence: 'high' | 'medium' | 'low';
}

interface VelocityMetrics {
  avgDaysToClose: number;
  avgPlacementFee: number;
  monthlyVelocity: number;
  closingRate: number; // % of deals that close
}

export function usePipelineForecast(year?: number) {
  const targetYear = year || new Date().getFullYear();

  return useQuery({
    queryKey: ['pipeline-forecast', targetYear],
    queryFn: async (): Promise<PipelineForecastData> => {
      // Get weighted pipeline from RPC
      const { data: pipelineResult } = await supabase
        .rpc('calculate_weighted_pipeline');

      // The RPC returns an array, get the first item
      const pipelineData = Array.isArray(pipelineResult) ? pipelineResult[0] : pipelineResult;
      const weightedPipeline = pipelineData?.weighted_pipeline_value || 0;
      const totalPipeline = pipelineData?.total_pipeline_value || 0;

      // Get active jobs in pipeline
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, deal_probability, deal_value_override, deal_stage')
        .in('deal_stage', ['briefing', 'longlist', 'interview', 'shortlist', 'offer'])
        .eq('status', 'active');

      const jobsList = jobs || [];
      const dealCount = jobsList.length;
      const avgDealValue = dealCount > 0 
        ? jobsList.reduce((sum, j) => sum + (Number(j.deal_value_override) || 15000), 0) / dealCount 
        : 0;
      const avgProbability = dealCount > 0 
        ? jobsList.reduce((sum, j) => sum + (Number(j.deal_probability) || 0), 0) / dealCount 
        : 0;

      // Get YTD placements for velocity calculation
      const yearStart = `${targetYear}-01-01`;
      const { data: placements } = await supabase
        .from('placement_fees')
        .select('id, fee_amount, hired_date')
        .gte('hired_date', yearStart)
        .order('hired_date', { ascending: true });

      // Calculate velocity metrics
      const avgPlacementFee = placements && placements.length > 0
        ? placements.reduce((sum, p) => sum + (Number(p.fee_amount) || 0), 0) / placements.length
        : 0;

      const daysPassed = Math.floor((Date.now() - new Date(yearStart).getTime()) / (1000 * 60 * 60 * 24));
      const monthlyVelocity = placements && daysPassed > 0
        ? (placements.reduce((sum, p) => sum + (Number(p.fee_amount) || 0), 0) / daysPassed) * 30
        : 0;

      // Calculate avg days between placements
      let avgDaysToClose = 0;
      if (placements && placements.length > 1) {
        const dates = placements.map(p => new Date(p.hired_date).getTime()).sort();
        let totalDays = 0;
        for (let i = 1; i < dates.length; i++) {
          totalDays += (dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24);
        }
        avgDaysToClose = totalDays / (dates.length - 1);
      }

      // Get approaching/locked milestones for projections
      const { data: milestones } = await supabase
        .from('revenue_milestones')
        .select(`
          id,
          display_name,
          threshold_amount,
          achieved_revenue,
          status,
          projected_unlock_date
        `)
        .in('status', ['locked', 'approaching'])
        .order('threshold_amount', { ascending: true })
        .limit(5);

      const projectedMilestones: ProjectedMilestone[] = (milestones || []).map(m => {
        const threshold = Number(m.threshold_amount);
        const currentRevenue = Number(m.achieved_revenue) || 0;
        const remaining = threshold - currentRevenue;
        const pipelineCoverage = remaining > 0 ? Math.min((weightedPipeline / remaining) * 100, 100) : 100;
        
        // Calculate projected unlock date
        let projectedUnlockDate: string | null = null;
        if (monthlyVelocity > 0 && remaining > 0) {
          const monthsToUnlock = remaining / monthlyVelocity;
          const unlockDate = new Date();
          unlockDate.setMonth(unlockDate.getMonth() + Math.ceil(monthsToUnlock));
          projectedUnlockDate = unlockDate.toISOString().split('T')[0];
        }

        // Determine confidence level
        let confidence: 'high' | 'medium' | 'low' = 'low';
        if (pipelineCoverage >= 80) confidence = 'high';
        else if (pipelineCoverage >= 50) confidence = 'medium';

        return {
          id: m.id,
          displayName: m.display_name,
          threshold,
          currentRevenue,
          remaining,
          projectedUnlockDate: m.projected_unlock_date || projectedUnlockDate,
          pipelineCoverage,
          confidence,
        };
      });

      return {
        weightedPipeline,
        totalPipeline,
        dealCount,
        avgDealValue,
        avgProbability: avgProbability * 100,
        projectedMilestones,
        velocityMetrics: {
          avgDaysToClose,
          avgPlacementFee,
          monthlyVelocity,
          closingRate: 0, // Could calculate from historical data
        },
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

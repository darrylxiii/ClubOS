import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PipelineDeal {
  application_id: string | null;
  candidate_full_name: string;
  job_title: string;
  company_name: string;
  stage: number;
  stage_name: string;
  potential_fee: number;
  weighted_value: number;
  probability: number;
}

export interface StageBreakdown {
  stage: number;
  stage_name: string;
  count: number;
  raw_value: number;
  weighted_value: number;
  probability: number;
}

export interface EmployeePipelineData {
  totalApplications: number;
  totalPlacements: number;
  rawPipelineValue: number;
  weightedPipelineValue: number;
  realizedRevenue: number;
  stageBreakdown: StageBreakdown[];
  topDeals: PipelineDeal[];
}

export function useEmployeePipelineValue(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['employee-pipeline-value', targetUserId],
    queryFn: async (): Promise<EmployeePipelineData> => {
      if (!targetUserId) throw new Error('No user ID');

      // Fetch summary
      const { data: summary, error: summaryError } = await supabase
        .from('employee_earnings_summary')
        .select('*')
        .eq('employee_id', targetUserId)
        .maybeSingle();

      if (summaryError) throw summaryError;

      // Fetch top deals
      const { data: deals, error: dealsError } = await supabase
        .from('employee_pipeline_value')
        .select('*')
        .eq('employee_id', targetUserId)
        .order('weighted_value', { ascending: false })
        .limit(5);

      if (dealsError) throw dealsError;

      const stageBreakdown: StageBreakdown[] = [
        { stage: 0, stage_name: 'Applied', count: summary?.stage_0_count || 0, raw_value: 0, weighted_value: summary?.stage_0_value || 0, probability: 0.10 },
        { stage: 1, stage_name: 'Screening', count: summary?.stage_1_count || 0, raw_value: 0, weighted_value: summary?.stage_1_value || 0, probability: 0.25 },
        { stage: 2, stage_name: 'Interview', count: summary?.stage_2_count || 0, raw_value: 0, weighted_value: summary?.stage_2_value || 0, probability: 0.50 },
        { stage: 3, stage_name: 'Offer', count: summary?.stage_3_count || 0, raw_value: 0, weighted_value: summary?.stage_3_value || 0, probability: 0.80 },
        { stage: 4, stage_name: 'Hired', count: summary?.stage_4_count || 0, raw_value: 0, weighted_value: summary?.stage_4_value || 0, probability: 1.00 },
      ];

      return {
        totalApplications: summary?.total_applications || 0,
        totalPlacements: summary?.total_placements || 0,
        rawPipelineValue: Number(summary?.raw_pipeline_value || 0),
        weightedPipelineValue: Number(summary?.weighted_pipeline_value || 0),
        realizedRevenue: Number(summary?.realized_revenue || 0),
        stageBreakdown,
        topDeals: (deals || []).map(d => ({
          application_id: d.application_id,
          candidate_full_name: d.candidate_full_name || 'Unknown',
          job_title: d.job_title || 'Unknown Role',
          company_name: d.company_name || 'Unknown Company',
          stage: d.stage || 0,
          stage_name: d.stage_name || 'Applied',
          potential_fee: Number(d.potential_fee || 0),
          weighted_value: Number(d.weighted_value || 0),
          probability: Number(d.probability || 0.1),
        })),
      };
    },
    enabled: !!targetUserId,
    staleTime: 30000,
  });
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

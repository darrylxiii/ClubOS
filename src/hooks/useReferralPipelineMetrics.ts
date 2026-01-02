import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ReferralPipelineMetrics {
  grossPipeline: number;
  referralObligations: number;
  netPipeline: number;
  weightedGross: number;
  weightedNet: number;
  dealCount: number;
}

export function useReferralPipelineMetrics() {
  return useQuery({
    queryKey: ['referral-pipeline-metrics'],
    queryFn: async (): Promise<ReferralPipelineMetrics> => {
      const { data, error } = await (supabase as any)
        .rpc('calculate_pipeline_with_referrals');

      if (error) {
        console.error('[ReferralPipelineMetrics] Error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return {
          grossPipeline: 0,
          referralObligations: 0,
          netPipeline: 0,
          weightedGross: 0,
          weightedNet: 0,
          dealCount: 0,
        };
      }

      return {
        grossPipeline: data[0]?.gross_pipeline || 0,
        referralObligations: data[0]?.referral_obligations || 0,
        netPipeline: data[0]?.net_pipeline || 0,
        weightedGross: data[0]?.weighted_gross || 0,
        weightedNet: data[0]?.weighted_net || 0,
        dealCount: data[0]?.deal_count || 0,
      };
    },
  });
}

export function useJobReferralPotential(jobId: string | undefined) {
  return useQuery({
    queryKey: ['job-referral-potential', jobId],
    queryFn: async () => {
      if (!jobId) return null;

      const { data, error } = await (supabase as any)
        .rpc('calculate_job_referral_potential', { p_job_id: jobId });

      if (error) {
        console.error('[JobReferralPotential] Error:', error);
        throw error;
      }

      if (!data || data.length === 0) return null;

      return {
        jobId: data[0].job_id,
        estimatedFee: data[0].estimated_fee || 0,
        referralBonusPercentage: data[0].referral_bonus_percentage || 10,
        potentialEarnings: data[0].potential_earnings || 0,
        salaryUsed: data[0].salary_used || 0,
      };
    },
    enabled: !!jobId,
  });
}

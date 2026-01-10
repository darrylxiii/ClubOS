import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SafetyCheckResult {
  approved: boolean;
  warnings: string[];
  errors: string[];
  financials: {
    currentCash: number;
    monthlyBurn: number;
    runwayMonths: number;
    rewardPercentage: number;
    postRewardCash: number;
    postRewardRunway: number;
  };
  rules: {
    minRunwayMonths: number;
    maxRewardPercentage: number;
    requireFinanceApprovalAbove: number;
    autoRejectIfRunwayBelow: number;
  };
  requiresFinanceApproval: boolean;
}

export function useCheckRewardSafety() {
  return useMutation({
    mutationFn: async ({ estimatedCost, proposalId }: { estimatedCost: number; proposalId?: string }): Promise<SafetyCheckResult> => {
      const { data, error } = await supabase.functions.invoke('check-reward-safety', {
        body: { estimatedCost, proposalId }
      });
      if (error) throw error;
      return data as SafetyCheckResult;
    }
  });
}

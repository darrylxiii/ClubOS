import { useMutation, useQuery } from '@tanstack/react-query';
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

export interface FinancialHealth {
  currentCash: number;
  monthlyBurn: number;
  runwayMonths: number;
  isHealthy: boolean;
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

export function useFinancialHealth() {
  return useQuery({
    queryKey: ['financial-health'],
    queryFn: async (): Promise<FinancialHealth> => {
      const { data, error } = await supabase
        .from('moneybird_financial_metrics')
        .select('total_paid')
        .order('last_synced_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      
      const currentCash = data?.total_paid || 0;
      const monthlyBurn = 50000; // Default estimate
      const runwayMonths = monthlyBurn > 0 ? currentCash / monthlyBurn : 99;
      
      return {
        currentCash,
        monthlyBurn,
        runwayMonths,
        isHealthy: runwayMonths >= 6
      };
    }
  });
}

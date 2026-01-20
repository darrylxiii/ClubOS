import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CRMPipelineMetrics {
  total_pipeline: number;
  weighted_pipeline: number;
  prospect_count: number;
  avg_deal_size: number;
}

interface StageProbability {
  stage: string;
  probability_weight: number;
  stage_order: number;
  is_terminal: boolean;
}

export function useCRMPipelineMetrics() {
  return useQuery({
    queryKey: ['crm-pipeline-metrics'],
    queryFn: async (): Promise<CRMPipelineMetrics> => {
      const { data, error } = await supabase.rpc('calculate_crm_weighted_pipeline');
      
      if (error) {
        console.error('Error fetching CRM pipeline metrics:', error);
        throw error;
      }
      
      // The RPC returns an array with one row
      const result = Array.isArray(data) ? data[0] : data;
      
      return {
        total_pipeline: Number(result?.total_pipeline || 0),
        weighted_pipeline: Number(result?.weighted_pipeline || 0),
        prospect_count: Number(result?.prospect_count || 0),
        avg_deal_size: Number(result?.avg_deal_size || 0),
      };
    },
    staleTime: 30000, // 30 seconds
  });
}

export function useStageProbabilities() {
  return useQuery({
    queryKey: ['crm-stage-probabilities'],
    queryFn: async (): Promise<Record<string, StageProbability>> => {
      const { data, error } = await supabase
        .from('crm_stage_probabilities')
        .select('*')
        .order('stage_order');
      
      if (error) {
        console.error('Error fetching stage probabilities:', error);
        throw error;
      }
      
      // Convert to a map for easy lookup
      const probabilityMap: Record<string, StageProbability> = {};
      (data || []).forEach((sp: StageProbability) => {
        probabilityMap[sp.stage] = sp;
      });
      
      return probabilityMap;
    },
    staleTime: 60000, // 1 minute
  });
}

export function formatCurrencyCompact(value: number): string {
  if (value >= 1000000) {
    return `€${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `€${(value / 1000).toFixed(0)}k`;
  }
  return `€${value.toFixed(0)}`;
}

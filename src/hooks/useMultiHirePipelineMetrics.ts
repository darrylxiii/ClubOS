import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MultiHirePipelineMetrics {
  totalProjectedValue: number;
  realizedValue: number;
  remainingPipeline: number;
  weightedRemaining: number;
  totalHires: number;
  totalTarget: number;
  multiHireRoleCount: number;
  progressPercent: number;
}

export interface ExtendedPipelineMetrics {
  totalPipelineValue: number;
  weightedPipelineValue: number;
  dealCount: number;
  avgDealSize: number;
  multiHireTotalProjected: number;
  multiHireRealized: number;
  multiHireRemaining: number;
}

export function useMultiHirePipelineMetrics() {
  return useQuery({
    queryKey: ['multi-hire-pipeline-metrics'],
    queryFn: async (): Promise<MultiHirePipelineMetrics> => {
      // Use type assertion since function was just created and types haven't synced
      const { data, error } = await supabase.rpc('get_multi_hire_pipeline_summary' as any);
      
      if (error) {
        console.error('Error fetching multi-hire pipeline metrics:', error);
        throw error;
      }
      
      const result = (Array.isArray(data) ? data[0] : data) as any;
      
      const totalTarget = Number(result?.total_target || 0);
      const totalHires = Number(result?.total_hires || 0);
      
      return {
        totalProjectedValue: Number(result?.total_projected_value || 0),
        realizedValue: Number(result?.realized_value || 0),
        remainingPipeline: Number(result?.remaining_pipeline || 0),
        weightedRemaining: Number(result?.weighted_remaining || 0),
        totalHires,
        totalTarget,
        multiHireRoleCount: Number(result?.multi_hire_role_count || 0),
        progressPercent: totalTarget > 0 ? Math.round((totalHires / totalTarget) * 100) : 0,
      };
    },
    staleTime: 30000,
  });
}

export function useExtendedPipelineMetrics() {
  return useQuery({
    queryKey: ['extended-pipeline-metrics'],
    queryFn: async (): Promise<ExtendedPipelineMetrics> => {
      const { data, error } = await supabase.rpc('calculate_weighted_pipeline');
      
      if (error) {
        console.error('Error fetching extended pipeline metrics:', error);
        throw error;
      }
      
      const result = Array.isArray(data) ? data[0] : data;
      
      return {
        totalPipelineValue: Number(result?.total_pipeline_value || 0),
        weightedPipelineValue: Number(result?.weighted_pipeline_value || 0),
        dealCount: Number(result?.deal_count || 0),
        avgDealSize: Number(result?.avg_deal_size || 0),
        multiHireTotalProjected: Number(result?.multi_hire_total_projected || 0),
        multiHireRealized: Number(result?.multi_hire_realized || 0),
        multiHireRemaining: Number(result?.multi_hire_remaining || 0),
      };
    },
    staleTime: 30000,
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

export function formatCurrencyFull(value: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PredictiveSignal {
  id: string;
  signal_type: string;
  entity_type: string;
  entity_id: string;
  signal_strength: number;
  contributing_factors: string[] | null;
  recommended_actions: string[] | null;
  evidence: Record<string, unknown>;
  detected_at: string | null;
  is_active: boolean | null;
  acknowledged: boolean | null;
}

export function usePredictiveSignals() {
  return useQuery({
    queryKey: ['predictive-signals-active'],
    queryFn: async (): Promise<PredictiveSignal[]> => {
      const { data, error } = await supabase
        .from('predictive_signals')
        .select('id, signal_type, entity_type, entity_id, signal_strength, contributing_factors, recommended_actions, evidence, detected_at, is_active, acknowledged')
        .eq('is_active', true)
        .or('acknowledged.is.null,acknowledged.eq.false')
        .order('signal_strength', { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data || []) as PredictiveSignal[];
    },
    staleTime: 60000,
    refetchInterval: 120000,
  });
}

export function useAcknowledgeSignal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (signalId: string) => {
      const { error } = await supabase
        .from('predictive_signals')
        .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
        .eq('id', signalId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predictive-signals-active'] });
    },
  });
}

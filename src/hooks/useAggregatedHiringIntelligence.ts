import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AggregatedHiringInsights } from "@/types/analytics";

export function useAggregatedHiringIntelligence(companyId?: string) {
  return useQuery<AggregatedHiringInsights | null>({
    queryKey: ['aggregated-hiring-intelligence', companyId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('predict-aggregated-hiring-outcomes', {
        body: { companyId }
      });

      if (error) throw error;
      return data?.insights || null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

export function useRefreshAggregatedIntelligence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (companyId?: string) => {
      const { data, error } = await supabase.functions.invoke('predict-aggregated-hiring-outcomes', {
        body: { companyId }
      });

      if (error) throw error;
      return data?.insights;
    },
    onSuccess: (data, companyId) => {
      queryClient.setQueryData(['aggregated-hiring-intelligence', companyId], data);
      toast.success("Intelligence refreshed successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to refresh intelligence");
      console.error('Refresh error:', error);
    }
  });
}

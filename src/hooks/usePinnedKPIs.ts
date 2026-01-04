import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PinnedKPI {
  id: string;
  user_id: string;
  kpi_id: string;
  kpi_domain: string;
  pinned_at: string;
}

export function usePinnedKPIs() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: pinnedKPIs = [], isLoading } = useQuery({
    queryKey: ['pinned-kpis', user?.id],
    queryFn: async (): Promise<PinnedKPI[]> => {
      if (!user?.id) return [];
      
      // Query the table using type assertion for new tables not yet in generated types
      const { data, error } = await (supabase
        .from('user_pinned_kpis' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('pinned_at', { ascending: false }) as any);

      if (error) {
        console.error('Error fetching pinned KPIs:', error);
        return [];
      }

      return (data || []) as PinnedKPI[];
    },
    enabled: !!user?.id,
  });

  const pinKPIMutation = useMutation({
    mutationFn: async ({ kpiId, domain }: { kpiId: string; domain: string }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await (supabase
        .from('user_pinned_kpis' as any)
        .insert({
          user_id: user.id,
          kpi_id: kpiId,
          kpi_domain: domain,
        })
        .select()
        .single() as any);

      if (error) throw error;
      return data as PinnedKPI;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pinned-kpis', user?.id] });
    },
  });

  const unpinKPIMutation = useMutation({
    mutationFn: async (kpiId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await (supabase
        .from('user_pinned_kpis' as any)
        .delete()
        .eq('user_id', user.id)
        .eq('kpi_id', kpiId) as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pinned-kpis', user?.id] });
    },
  });

  const isPinned = (kpiId: string) => {
    return pinnedKPIs.some((p) => p.kpi_id === kpiId);
  };

  const togglePin = (kpiId: string, domain: string) => {
    if (isPinned(kpiId)) {
      unpinKPIMutation.mutate(kpiId);
    } else {
      pinKPIMutation.mutate({ kpiId, domain });
    }
  };

  const pinnedKPIIds = pinnedKPIs.map((p) => p.kpi_id);

  return {
    pinnedKPIs,
    pinnedKPIIds,
    isLoading,
    isPinned,
    togglePin,
    pinKPI: pinKPIMutation.mutate,
    unpinKPI: unpinKPIMutation.mutate,
    isPinning: pinKPIMutation.isPending,
    isUnpinning: unpinKPIMutation.isPending,
  };
}

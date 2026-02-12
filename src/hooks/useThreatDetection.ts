import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ThreatEvent, BlockedIP, ThreatSummary } from '@/types/threat';
import { useEffect } from 'react';
import { toast } from 'sonner';

export function useThreatSummary() {
  return useQuery({
    queryKey: ['threat-summary'],
    queryFn: async (): Promise<ThreatSummary> => {
      const { data, error } = await supabase.rpc('get_threat_summary');
      if (error) throw error;
      return data as unknown as ThreatSummary;
    },
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
    staleTime: 30000,
  });
}

export function useThreatEvents(limit = 50) {
  return useQuery({
    queryKey: ['threat-events', limit],
    queryFn: async (): Promise<ThreatEvent[]> => {
      const { data, error } = await supabase
        .from('threat_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as ThreatEvent[];
    },
    refetchInterval: 15000,
  });
}

export function useBlockedIPs() {
  return useQuery({
    queryKey: ['blocked-ips'],
    queryFn: async (): Promise<BlockedIP[]> => {
      const { data, error } = await supabase
        .from('blocked_ips')
        .select('*')
        .eq('is_active', true)
        .order('blocked_at', { ascending: false });
      if (error) throw error;
      return (data || []) as BlockedIP[];
    },
    refetchInterval: 30000,
  });
}

export function useBlockIP() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      ip_address, 
      reason, 
      expires_hours 
    }: { 
      ip_address: string; 
      reason: string; 
      expires_hours?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('blocked_ips').insert({
        ip_address,
        block_type: 'manual',
        reason,
        blocked_by: user?.id,
        expires_at: expires_hours 
          ? new Date(Date.now() + expires_hours * 60 * 60 * 1000).toISOString() 
          : null,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-ips'] });
      queryClient.invalidateQueries({ queryKey: ['threat-summary'] });
      toast.success('IP blocked successfully');
    },
    onError: (error) => {
      toast.error('Failed to block IP: ' + error.message);
    },
  });
}

export function useUnblockIP() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('blocked_ips')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-ips'] });
      queryClient.invalidateQueries({ queryKey: ['threat-summary'] });
      toast.success('IP unblocked successfully');
    },
    onError: (error) => {
      toast.error('Failed to unblock IP: ' + error.message);
    },
  });
}

export function useResolveThreat() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      resolution_notes 
    }: { 
      id: string; 
      resolution_notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('threat_events')
        .update({ 
          is_resolved: true, 
          resolved_by: user?.id,
          resolved_at: new Date().toISOString(),
          resolution_notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threat-events'] });
      queryClient.invalidateQueries({ queryKey: ['threat-summary'] });
      toast.success('Threat resolved');
    },
    onError: (error) => {
      toast.error('Failed to resolve threat: ' + error.message);
    },
  });
}

export function useRunThreatScan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('detect-threats');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['threat-events'] });
      queryClient.invalidateQueries({ queryKey: ['threat-summary'] });
      const total = (data.detected?.brute_force || 0) + 
                    (data.detected?.enumeration || 0) + 
                    (data.detected?.rate_abuse || 0);
      if (total > 0) {
        toast.warning(`Detected ${total} new threats`);
      } else {
        toast.success('Threat scan complete - no new threats');
      }
    },
    onError: (error) => {
      toast.error('Threat scan failed: ' + error.message);
    },
  });
}

export function useThreatRealtimeSubscription() {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const channel = supabase
      .channel('threat-events-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'threat_events' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['threat-events'] });
          queryClient.invalidateQueries({ queryKey: ['threat-summary'] });
          
          const event = payload.new as ThreatEvent;
          if (event.severity === 'critical' || event.severity === 'high') {
            toast.error(`🚨 ${event.severity.toUpperCase()} THREAT: ${event.description}`);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'blocked_ips' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['blocked-ips'] });
          queryClient.invalidateQueries({ queryKey: ['threat-summary'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

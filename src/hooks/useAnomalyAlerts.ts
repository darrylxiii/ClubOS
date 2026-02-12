import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { toast } from "sonner";

export interface AnomalyAlert {
  id: string;
  anomaly_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affected_users: number;
  affected_segment: string | null;
  detection_data: {
    description?: string;
    [key: string]: any;
  };
  detected_at: string;
  resolved_at: string | null;
  resolution_notes: string | null;
  alert_sent: boolean;
}

export function useAnomalyAlerts() {
  const queryClient = useQueryClient();

  const { data: anomalies, isLoading, error, refetch } = useQuery<AnomalyAlert[]>({
    queryKey: ['anomaly-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('detected_anomalies')
        .select('*')
        .is('resolved_at', null)
        .order('severity', { ascending: false })
        .order('detected_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as AnomalyAlert[];
    },
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
    staleTime: 30000,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('anomalies-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'detected_anomalies' },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  // Resolve anomaly mutation
  const resolveAnomaly = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { error } = await supabase
        .from('detected_anomalies')
        .update({
          resolved_at: new Date().toISOString(),
          resolution_notes: notes || 'Resolved via Command Center',
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anomaly-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['command-center-summary'] });
      toast.success('Anomaly resolved');
    },
    onError: () => {
      toast.error('Failed to resolve anomaly');
    },
  });

  // Trigger anomaly detection
  const triggerDetection = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('detect-anomalies');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['anomaly-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['command-center-summary'] });
      toast.success(`Detection complete: ${data?.anomalies_detected || 0} anomalies found`);
    },
    onError: () => {
      toast.error('Failed to run anomaly detection');
    },
  });

  return {
    anomalies: anomalies || [],
    isLoading,
    error,
    refetch,
    resolveAnomaly,
    triggerDetection,
  };
}

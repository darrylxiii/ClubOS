import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAdminRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('admin-dashboard-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pipeline_audit_logs',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['strategist-workload'] });
        queryClient.invalidateQueries({ queryKey: ['needs-attention-alerts'] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'employee_commissions',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['employee-management-stats'] });
        queryClient.invalidateQueries({ queryKey: ['my-performance-data'] });
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'applications',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['strategist-workload'] });
        queryClient.invalidateQueries({ queryKey: ['team-revenue'] });
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'placement_fees',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['team-revenue'] });
        queryClient.invalidateQueries({ queryKey: ['my-performance-data'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

type AuditAction = 'view' | 'export' | 'configure' | 'refresh' | 'pin' | 'unpin' | 'alert_config' | 'drill_down';

interface AuditLogEntry {
  id: string;
  user_id: string | null;
  action_type: string;
  kpi_name: string | null;
  domain: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface AuditSummary {
  total_actions: number;
  unique_users: number;
  by_action_type: Record<string, number>;
  by_domain: Record<string, number>;
  top_kpis: Array<{ kpi_name: string; count: number }>;
  period_days: number;
}

export function useKPIAuditLog() {
  const logAction = useCallback(async (
    action: AuditAction,
    kpiName?: string,
    domain?: string,
    metadata: Record<string, unknown> = {}
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.rpc('log_kpi_access' as never, {
        p_user_id: user.id,
        p_action_type: action,
        p_kpi_name: kpiName || null,
        p_domain: domain || null,
        p_metadata: metadata as unknown
      } as never);
    } catch (error) {
      console.error('Failed to log KPI access:', error);
    }
  }, []);

  return { logAction };
}

export function useKPIAuditSummary(days: number = 30) {
  return useQuery({
    queryKey: ['kpi-audit-summary', days],
    queryFn: async (): Promise<AuditSummary> => {
      const { data, error } = await supabase.rpc('get_kpi_audit_summary', {
        p_days: days
      });
      
      if (error) throw error;
      return data as unknown as AuditSummary;
    },
    staleTime: 60000,
  });
}

export function useKPIAuditHistory(limit: number = 100) {
  return useQuery({
    queryKey: ['kpi-audit-history', limit],
    queryFn: async (): Promise<AuditLogEntry[]> => {
      const { data, error } = await supabase
        .from('kpi_access_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return (data || []) as unknown as AuditLogEntry[];
    },
    staleTime: 30000,
  });
}

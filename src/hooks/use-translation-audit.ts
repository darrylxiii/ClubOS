import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TranslationAuditEntry {
  id: string;
  translation_id: string | null;
  namespace: string;
  language: string;
  key_path: string;
  old_value: string | null;
  new_value: string | null;
  action: string;
  changed_by: string | null;
  changed_at: string;
  metadata: Record<string, unknown>;
}

interface AuditFilters {
  namespace?: string;
  language?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export function useTranslationAuditLog(filters: AuditFilters = {}) {
  return useQuery({
    queryKey: ['translation-audit-log', filters],
    queryFn: async () => {
      let query = supabase
        .from('translation_audit_log')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(filters.limit || 100);
      
      if (filters.namespace) {
        query = query.eq('namespace', filters.namespace);
      }
      if (filters.language) {
        query = query.eq('language', filters.language);
      }
      if (filters.action) {
        query = query.eq('action', filters.action);
      }
      if (filters.startDate) {
        query = query.gte('changed_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('changed_at', filters.endDate);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as TranslationAuditEntry[];
    },
  });
}

export function useLogTranslationChange() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (entry: Omit<TranslationAuditEntry, 'id' | 'changed_at' | 'changed_by'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const insertPayload = {
          ...entry,
          changed_by: user?.id,
        };
      const { data, error } = await supabase
        .from('translation_audit_log')
        .insert(insertPayload as typeof insertPayload & { metadata: Record<string, string> })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['translation-audit-log'] });
    },
  });
}

export function useAuditLogStats() {
  return useQuery({
    queryKey: ['translation-audit-stats'],
    queryFn: async () => {
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const [todayResult, weekResult, totalResult] = await Promise.all([
        supabase
          .from('translation_audit_log')
          .select('id', { count: 'exact', head: true })
          .gte('changed_at', dayAgo.toISOString()),
        supabase
          .from('translation_audit_log')
          .select('id', { count: 'exact', head: true })
          .gte('changed_at', weekAgo.toISOString()),
        supabase
          .from('translation_audit_log')
          .select('id', { count: 'exact', head: true }),
      ]);
      
      return {
        today: todayResult.count || 0,
        thisWeek: weekResult.count || 0,
        total: totalResult.count || 0,
      };
    },
  });
}

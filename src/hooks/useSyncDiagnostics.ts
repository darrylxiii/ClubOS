import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SyncLog {
  id: string;
  sync_type: string;
  source: string;
  direction: string;
  total_records: number;
  synced_records: number;
  created_records: number;
  updated_records: number;
  failed_records: number;
  errors: unknown;
  triggered_by: string | null;
  started_at: string;
  completed_at: string | null;
}

// Type guard to check if errors is an array of error objects
function isErrorArray(errors: unknown): errors is { email?: string; error: string }[] {
  return Array.isArray(errors) && errors.every(e => typeof e === 'object' && e !== null && 'error' in e);
}

export function getSyncErrors(log: SyncLog | null): { email?: string; error: string }[] {
  if (!log?.errors) return [];
  if (isErrorArray(log.errors)) return log.errors;
  return [];
}

export function useSyncDiagnostics() {
  return useQuery({
    queryKey: ['sync-diagnostics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_sync_logs')
        .select('*')
        .eq('source', 'instantly')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch sync diagnostics:', error);
        return null;
      }

      return data as SyncLog | null;
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });
}

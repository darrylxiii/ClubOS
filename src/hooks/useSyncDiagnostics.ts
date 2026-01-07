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

export interface SyncDiagnostics {
  lastSync: SyncLog | null;
  recentSyncs: SyncLog[];
  syncsByType: {
    campaigns: SyncLog | null;
    leads: SyncLog | null;
    accountHealth: SyncLog | null;
  };
  stats: {
    totalSyncsToday: number;
    successRate: number;
    avgSyncDuration: number;
    lastSuccessfulSync: string | null;
  };
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
    queryFn: async (): Promise<SyncDiagnostics> => {
      // Fetch recent syncs (last 20)
      const { data: recentSyncs, error } = await supabase
        .from('crm_sync_logs')
        .select('*')
        .eq('source', 'instantly')
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Failed to fetch sync diagnostics:', error);
        return {
          lastSync: null,
          recentSyncs: [],
          syncsByType: { campaigns: null, leads: null, accountHealth: null },
          stats: { totalSyncsToday: 0, successRate: 0, avgSyncDuration: 0, lastSuccessfulSync: null },
        };
      }

      const syncs = (recentSyncs || []) as SyncLog[];
      const lastSync = syncs[0] || null;

      // Group by sync type to get latest of each
      const campaignSync = syncs.find(s => s.sync_type === 'instantly_campaigns' || s.sync_type === 'campaigns') || null;
      const leadsSync = syncs.find(s => s.sync_type === 'instantly_leads' || s.sync_type === 'leads') || null;
      const healthSync = syncs.find(s => s.sync_type === 'instantly_account_health' || s.sync_type === 'account_health') || null;

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaySyncs = syncs.filter(s => new Date(s.started_at) >= today);
      const successfulSyncs = syncs.filter(s => (s.failed_records || 0) === 0);
      
      // Calculate average duration for completed syncs
      const completedSyncs = syncs.filter(s => s.completed_at);
      const avgDuration = completedSyncs.length > 0
        ? completedSyncs.reduce((sum, s) => {
            const duration = new Date(s.completed_at!).getTime() - new Date(s.started_at).getTime();
            return sum + duration;
          }, 0) / completedSyncs.length / 1000 // in seconds
        : 0;

      const lastSuccessful = successfulSyncs[0]?.completed_at || null;

      return {
        lastSync,
        recentSyncs: syncs,
        syncsByType: {
          campaigns: campaignSync,
          leads: leadsSync,
          accountHealth: healthSync,
        },
        stats: {
          totalSyncsToday: todaySyncs.length,
          successRate: syncs.length > 0 ? (successfulSyncs.length / syncs.length) * 100 : 0,
          avgSyncDuration: Math.round(avgDuration),
          lastSuccessfulSync: lastSuccessful,
        },
      };
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });
}

// Keep the original hook for backwards compatibility
export function useLatestSync() {
  const { data } = useSyncDiagnostics();
  return data?.lastSync || null;
}

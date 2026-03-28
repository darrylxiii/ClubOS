import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeChannel } from '@/hooks/useRealtimeChannel';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────

export type AlertCategory =
  | 'competitor'
  | 'layoff'
  | 'salary'
  | 'offer_activity'
  | 'pipeline';

export type DeliveryMethod = 'in_app' | 'in_app_email' | 'in_app_push';

export interface MarketAlert {
  id: string;
  alert_type: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  action_required: string;
  action_url: string;
  metadata: any;
  category: AlertCategory;
  is_dismissed: boolean;
  snoozed_until: string | null;
  created_at: string;
}

export interface AlertPreferences {
  competitor: boolean;
  layoff: boolean;
  salary: boolean;
  offer_activity: boolean;
  pipeline: boolean;
  delivery_method: DeliveryMethod;
}

const DEFAULT_PREFERENCES: AlertPreferences = {
  competitor: true,
  layoff: true,
  salary: true,
  offer_activity: true,
  pipeline: true,
  delivery_method: 'in_app',
};

const STORAGE_KEY = 'clubos_market_alert_prefs';

// ── Helpers ──────────────────────────────────────────────────────

function loadPreferences(): AlertPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
  } catch {
    // ignore corrupt storage
  }
  return DEFAULT_PREFERENCES;
}

function savePreferences(prefs: AlertPreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // storage full – swallow silently
  }
}

// ── Alert categories mapped from alert_type ──────────────────────

const CATEGORY_MAP: Record<string, AlertCategory> = {
  competitor_movement: 'competitor',
  competitor_hiring: 'competitor',
  layoff_event: 'layoff',
  layoff_alert: 'layoff',
  salary_change: 'salary',
  salary_benchmark: 'salary',
  offer_activity: 'offer_activity',
  candidate_offer: 'offer_activity',
  pipeline_stall: 'pipeline',
  pipeline_bottleneck: 'pipeline',
};

function resolveCategory(alertType: string): AlertCategory {
  return CATEGORY_MAP[alertType] || 'pipeline';
}

// ── Hook ─────────────────────────────────────────────────────────

export function useMarketAlerts(companyId: string | undefined) {
  const queryClient = useQueryClient();
  const [preferences, setPreferencesState] = useState<AlertPreferences>(loadPreferences);

  // Active category types based on preferences
  const enabledCategories = useMemo(
    () =>
      (Object.keys(preferences) as (keyof AlertPreferences)[]).filter(
        k => k !== 'delivery_method' && preferences[k] === true,
      ) as AlertCategory[],
    [preferences],
  );

  // ── Fetch alerts ───────────────────────────────────────────────
  const {
    data: rawAlerts,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['market-alerts', companyId],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('partner_smart_alerts')
          .select('*')
          .eq('company_id', companyId)
          .eq('is_dismissed', false)
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) return [];
        return (data || []) as MarketAlert[];
      } catch {
        return [];
      }
    },
    enabled: !!companyId,
    refetchInterval: 300000,
    staleTime: 120000,
  });

  // Enrich with resolved category and filter by preferences
  const alerts = useMemo(() => {
    if (!rawAlerts) return [];
    return rawAlerts
      .map(a => ({ ...a, category: a.category || resolveCategory(a.alert_type) }))
      .filter(a => {
        // Filter by enabled preferences
        if (!enabledCategories.includes(a.category)) return false;
        // Filter out snoozed
        if (a.snoozed_until && new Date(a.snoozed_until) > new Date()) return false;
        return true;
      });
  }, [rawAlerts, enabledCategories]);

  // ── Dismiss ────────────────────────────────────────────────────
  const dismiss = useMutation({
    mutationFn: async (alertId: string) => {
      try {
        const { error } = await (supabase as any)
          .from('partner_smart_alerts')
          .update({ is_dismissed: true })
          .eq('id', alertId);
        if (error) throw error;
      } catch (err) {
        console.error('[useMarketAlerts] dismiss failed:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-alerts', companyId] });
    },
  });

  // ── Snooze (4 hours by default) ────────────────────────────────
  const snooze = useMutation({
    mutationFn: async ({ alertId, hours = 4 }: { alertId: string; hours?: number }) => {
      try {
        const snoozedUntil = new Date(Date.now() + hours * 3600000).toISOString();
        const { error } = await (supabase as any)
          .from('partner_smart_alerts')
          .update({ snoozed_until: snoozedUntil })
          .eq('id', alertId);
        if (error) throw error;
      } catch (err) {
        console.error('[useMarketAlerts] snooze failed:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-alerts', companyId] });
    },
  });

  // ── Preferences ────────────────────────────────────────────────
  const updatePreferences = useCallback(
    (next: Partial<AlertPreferences>) => {
      setPreferencesState(prev => {
        const merged = { ...prev, ...next };
        savePreferences(merged);
        return merged;
      });
    },
    [],
  );

  // ── Realtime ───────────────────────────────────────────────────
  useRealtimeChannel({
    channelName: `market-alerts-${companyId}`,
    subscriptions: [
      {
        table: 'partner_smart_alerts',
        event: 'INSERT',
        filter: companyId ? `company_id=eq.${companyId}` : undefined,
        invalidateKeys: [['market-alerts', companyId!]],
        onEvent: (payload) => {
          const record = payload.new as any;
          if (record?.title) {
            toast.info(record.title, { description: record.message });
          }
        },
      },
    ],
    enabled: !!companyId,
  });

  // ── Derived counts ─────────────────────────────────────────────
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const thisWeekCount = alerts.filter(a => new Date(a.created_at) >= weekAgo).length;

  return {
    alerts,
    preferences,
    dismiss,
    snooze,
    updatePreferences,
    isLoading,
    isError,
    criticalCount,
    thisWeekCount,
  };
}

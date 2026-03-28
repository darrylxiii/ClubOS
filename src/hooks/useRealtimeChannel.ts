import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type PostgresEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface SubscriptionConfig {
  /** Supabase table name */
  table: string;
  /** Event type to listen for */
  event: PostgresEvent;
  /** Optional PostgREST filter (e.g. "company_id=eq.xxx") */
  filter?: string;
  /** Query keys to invalidate when this event fires */
  invalidateKeys: (string | string[])[];
  /** Optional callback with the payload for custom logic (toasts, etc.) */
  onEvent?: (payload: RealtimePostgresChangesPayload<any>) => void;
}

interface UseRealtimeChannelOptions {
  /** Unique channel name */
  channelName: string;
  /** Array of table subscriptions */
  subscriptions: SubscriptionConfig[];
  /** Whether the channel should be active */
  enabled?: boolean;
}

/**
 * Generic real-time subscription hook.
 * Consolidates multiple table subscriptions into a single Supabase channel
 * with automatic query invalidation and cleanup.
 *
 * Usage:
 * ```ts
 * useRealtimeChannel({
 *   channelName: `war-room-${companyId}`,
 *   subscriptions: [
 *     { table: 'applications', event: 'UPDATE', invalidateKeys: [['pipeline', companyId]] },
 *     { table: 'jobs', event: '*', filter: `company_id=eq.${companyId}`, invalidateKeys: [['jobs', companyId]] },
 *   ],
 *   enabled: !!companyId,
 * });
 * ```
 */
export function useRealtimeChannel({
  channelName,
  subscriptions,
  enabled = true,
}: UseRealtimeChannelOptions) {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!enabled || subscriptions.length === 0) return;

    let channel = supabase.channel(channelName);

    for (const sub of subscriptions) {
      const config: any = {
        event: sub.event,
        schema: 'public',
        table: sub.table,
      };
      if (sub.filter) {
        config.filter = sub.filter;
      }

      channel = channel.on(
        'postgres_changes',
        config,
        (payload: RealtimePostgresChangesPayload<any>) => {
          // Invalidate all specified query keys
          for (const key of sub.invalidateKeys) {
            const queryKey = Array.isArray(key) ? key : [key];
            queryClient.invalidateQueries({ queryKey });
          }
          // Fire custom callback if provided
          sub.onEvent?.(payload);
        }
      );
    }

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [channelName, enabled, queryClient, subscriptions]);
}

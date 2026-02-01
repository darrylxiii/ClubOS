import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseJobsRealtimeOptions {
  onJobInsert?: (job: any) => void;
  onJobUpdate?: (job: any) => void;
  onJobDelete?: (oldJob: any) => void;
  onApplicationChange?: (payload: any) => void;
  companyId?: string | null;
  enabled?: boolean;
}

/**
 * Hook for subscribing to real-time job and application updates
 * Debounces updates to prevent UI thrashing
 */
export function useJobsRealtime({
  onJobInsert,
  onJobUpdate,
  onJobDelete,
  onApplicationChange,
  companyId,
  enabled = true,
}: UseJobsRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<Map<string, any>>(new Map());

  // Debounced handler for batching rapid updates
  const flushUpdates = useCallback(() => {
    if (pendingUpdatesRef.current.size === 0) return;

    pendingUpdatesRef.current.forEach((payload, id) => {
      if (payload.eventType === 'INSERT' && onJobInsert) {
        onJobInsert(payload.new);
      } else if (payload.eventType === 'UPDATE' && onJobUpdate) {
        onJobUpdate(payload.new);
      } else if (payload.eventType === 'DELETE' && onJobDelete) {
        onJobDelete(payload.old);
      }
    });

    pendingUpdatesRef.current.clear();
  }, [onJobInsert, onJobUpdate, onJobDelete]);

  const scheduleFlush = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(flushUpdates, 500);
  }, [flushUpdates]);

  useEffect(() => {
    if (!enabled) return;

    // Create channel for jobs table
    const channel = supabase
      .channel('jobs-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
          ...(companyId ? { filter: `company_id=eq.${companyId}` } : {}),
        },
        (payload) => {
          // Queue update with debouncing
          const newRecord = payload.new as { id?: string } | null;
          const oldRecord = payload.old as { id?: string } | null;
          const recordId = newRecord?.id || oldRecord?.id;
          if (recordId) {
            pendingUpdatesRef.current.set(recordId, payload);
            scheduleFlush();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'applications',
        },
        (payload) => {
          if (onApplicationChange) {
            onApplicationChange(payload);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [enabled, companyId, scheduleFlush, onApplicationChange]);

  return {
    isSubscribed: !!channelRef.current,
  };
}

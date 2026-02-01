import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';

export interface CompanyActivityEvent {
  id: string;
  company_id: string;
  event_type: string;
  actor_id: string | null;
  actor_name: string | null;
  target_type: string | null;
  target_id: string | null;
  target_name: string | null;
  metadata: Json;
  created_at: string;
}

interface UseCompanyActivityOptions {
  companyId: string;
  limit?: number;
  eventTypes?: string[];
}

export function useCompanyActivity(options: UseCompanyActivityOptions) {
  const { user } = useAuth();
  const { companyId, limit = 50, eventTypes } = options;
  
  const [events, setEvents] = useState<CompanyActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const loadEvents = useCallback(async (cursor?: string) => {
    if (!companyId) {
      setEvents([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('company_activity_events' as any)
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(limit + 1);

      if (eventTypes && eventTypes.length > 0) {
        query = query.in('event_type', eventTypes);
      }

      if (cursor) {
        query = query.lt('created_at', cursor);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      const hasMoreItems = data && data.length > limit;
      const items = (hasMoreItems ? data.slice(0, limit) : data || []) as unknown as CompanyActivityEvent[];

      if (cursor) {
        setEvents(prev => [...prev, ...items]);
      } else {
        setEvents(items);
      }
      
      setHasMore(hasMoreItems);
    } catch (err: any) {
      console.error('[useCompanyActivity] Error loading events:', err);
      setError(err.message || 'Failed to load activity');
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, limit, eventTypes]);

  // Initial load
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Real-time subscription
  useEffect(() => {
    if (!companyId || !user) return;

    const channel = supabase
      .channel(`company-activity-${companyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'company_activity_events',
          filter: `company_id=eq.${companyId}`
        },
        (payload) => {
          const newEvent = payload.new as CompanyActivityEvent;
          setEvents(prev => [newEvent, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, user]);

  const loadMore = useCallback(() => {
    if (events.length > 0 && hasMore) {
      const lastEvent = events[events.length - 1];
      loadEvents(lastEvent.created_at);
    }
  }, [events, hasMore, loadEvents]);

  return {
    events,
    isLoading,
    error,
    hasMore,
    loadMore,
    refresh: () => loadEvents()
  };
}

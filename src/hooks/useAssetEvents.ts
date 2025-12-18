import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AssetEvent {
  id: string;
  asset_id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
}

export function useAssetEvents(assetId?: string) {
  const [events, setEvents] = useState<AssetEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = useCallback(async () => {
    if (!assetId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventory_asset_events')
        .select('*')
        .eq('asset_id', assetId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents((data || []) as AssetEvent[]);
    } catch (err) {
      console.error('Failed to fetch asset events:', err);
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const createEvent = async (
    eventType: string,
    eventData?: Json,
    previousValue?: Json,
    newValue?: Json
  ) => {
    if (!assetId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('inventory_asset_events')
        .insert([{
          asset_id: assetId,
          event_type: eventType,
          event_data: eventData || {},
          previous_value: previousValue || null,
          new_value: newValue || null,
          created_by: user?.id || null,
        }]);

      if (error) throw error;
      await fetchEvents();
    } catch (err) {
      console.error('Failed to create asset event:', err);
    }
  };

  return { events, loading, refetch: fetchEvents, createEvent };
}

export function useDepreciationRuns(year?: number, month?: number) {
  const [runs, setRuns] = useState<DepreciationRun[]>([]);
  const [loading, setLoading] = useState(false);

  interface DepreciationRun {
    id: string;
    period_year: number;
    period_month: number;
    total_entries: number;
    total_depreciation: number;
    run_type: string;
    run_by: string | null;
    run_at: string;
    metadata: Json;
  }

  const fetchRuns = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('inventory_depreciation_runs')
        .select('*')
        .order('run_at', { ascending: false });

      if (year) query = query.eq('period_year', year);
      if (month) query = query.eq('period_month', month);

      const { data, error } = await query;
      if (error) throw error;
      setRuns((data || []) as DepreciationRun[]);
    } catch (err) {
      console.error('Failed to fetch depreciation runs:', err);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const createRun = async (
    periodYear: number,
    periodMonth: number,
    totalEntries: number,
    totalDepreciation: number,
    runType: 'generate' | 'update' | 'partial' = 'generate',
    metadata?: Json
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('inventory_depreciation_runs')
        .insert([{
          period_year: periodYear,
          period_month: periodMonth,
          total_entries: totalEntries,
          total_depreciation: totalDepreciation,
          run_type: runType,
          run_by: user?.id || null,
          metadata: metadata || {},
        }])
        .select()
        .single();

      if (error) throw error;
      await fetchRuns();
      return data;
    } catch (err) {
      console.error('Failed to create depreciation run:', err);
      return null;
    }
  };

  return { runs, loading, refetch: fetchRuns, createRun };
}

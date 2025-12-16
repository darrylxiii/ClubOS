import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';

type UnifiedCommunicationRow = Database['public']['Tables']['unified_communications']['Row'];

export function useUnifiedCommunications(entityType?: string, entityId?: string) {
  const [communications, setCommunications] = useState<UnifiedCommunicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const fetchCommunications = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('unified_communications')
        .select('*')
        .order('occurred_at', { ascending: false });

      if (entityType && entityId) {
        query = query
          .eq('entity_type', entityType as UnifiedCommunicationRow['entity_type'])
          .eq('entity_id', entityId);
      }

      const { data, error: fetchError } = await query.limit(100);

      if (fetchError) throw fetchError;
      setCommunications(data || []);
    } catch (err: any) {
      setError(err);
      console.error('Error fetching unified communications:', err);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  const syncCommunication = useCallback(async (
    sourceTable: string,
    sourceId: string,
    channel: string
  ) => {
    try {
      const { error } = await supabase.functions.invoke('sync-communication-to-unified', {
        body: { source_table: sourceTable, source_id: sourceId, channel }
      });

      if (error) throw error;
      await fetchCommunications();
      
      toast({ title: 'Communication synced', description: 'Successfully added to unified timeline' });
    } catch (err: any) {
      toast({ title: 'Sync failed', description: err.message, variant: 'destructive' });
    }
  }, [fetchCommunications, toast]);

  const getEntityTimeline = useCallback(async (type: string, id: string) => {
    try {
      const { data, error } = await supabase
        .from('unified_communications')
        .select('*')
        .eq('entity_type', type as UnifiedCommunicationRow['entity_type'])
        .eq('entity_id', id)
        .order('occurred_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.error('Error fetching entity timeline:', err);
      return [];
    }
  }, []);

  const getKeyMoments = useCallback(async (type?: string, id?: string) => {
    try {
      let query = supabase
        .from('unified_communications')
        .select('*')
        .not('key_moment_type', 'is', null)
        .order('occurred_at', { ascending: false });

      if (type && id) {
        query = query
          .eq('entity_type', type as UnifiedCommunicationRow['entity_type'])
          .eq('entity_id', id);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.error('Error fetching key moments:', err);
      return [];
    }
  }, []);

  useEffect(() => {
    fetchCommunications();

    const channel = supabase
      .channel('unified_communications_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'unified_communications' }, () => {
        fetchCommunications();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchCommunications]);

  return {
    communications,
    loading,
    error,
    refetch: fetchCommunications,
    syncCommunication,
    getEntityTimeline,
    getKeyMoments
  };
}

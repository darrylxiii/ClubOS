import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notify';
import type { Database } from '@/integrations/supabase/types';

type CrossChannelPatternRow = Database['public']['Tables']['cross_channel_patterns']['Row'];

export function useCrossChannelPatterns(entityType?: string, entityId?: string) {
  const [patterns, setPatterns] = useState<CrossChannelPatternRow[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<CrossChannelPatternRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPatterns = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('cross_channel_patterns')
        .select('*')
        .order('detected_at', { ascending: false });

      if (entityType && entityId) {
        query = query
          .eq('entity_type', entityType as CrossChannelPatternRow['entity_type'])
          .eq('entity_id', entityId);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      
      const typedData = data || [];
      setPatterns(typedData);
      setActiveAlerts(typedData.filter(p => p.is_active));
    } catch (err: unknown) {
      console.error('Error fetching patterns:', err);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  const analyzePatterns = useCallback(async (type?: string, id?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-cross-channel-patterns', {
        body: type && id ? { entity_type: type, entity_id: id } : {}
      });

      if (error) throw error;
      await fetchPatterns();
      
      notify.success('Analysis complete', { description: `Found ${data?.patterns_detected || 0} patterns` });
      return data;
    } catch (err: unknown) {
      notify.error('Analysis failed', { description: err instanceof Error ? err.message : 'Unknown error' });
      return null;
    }
  }, [fetchPatterns]);

  const resolvePattern = useCallback(async (patternId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('cross_channel_patterns')
        .update({
          is_active: false,
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: user?.id
        })
        .eq('id', patternId);

      if (error) throw error;
      await fetchPatterns();
      
      notify.success('Pattern resolved', { description: 'Alert has been dismissed' });
    } catch (err: unknown) {
      notify.error('Failed to resolve', { description: err instanceof Error ? err.message : 'Unknown error' });
    }
  }, [fetchPatterns]);

  const getPatternsByType = useCallback((type: string) => {
    return patterns.filter(p => p.pattern_type === type && p.is_active);
  }, [patterns]);

  const getHighPriorityAlerts = useCallback(() => {
    return activeAlerts.filter(p => 
      (p.confidence || 0) >= 0.7 && 
      ['going_cold', 'needs_escalation', 'ready_to_convert'].includes(p.pattern_type || '')
    );
  }, [activeAlerts]);

  useEffect(() => {
    fetchPatterns();

    const channel = supabase
      .channel('cross_channel_patterns_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cross_channel_patterns' }, () => {
        fetchPatterns();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchPatterns]);

  return {
    patterns,
    activeAlerts,
    loading,
    refetch: fetchPatterns,
    analyzePatterns,
    resolvePattern,
    getPatternsByType,
    getHighPriorityAlerts
  };
}

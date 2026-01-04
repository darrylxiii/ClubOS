import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notify';
import { Database } from '@/integrations/supabase/types';

type RelationshipScoreRow = Database['public']['Tables']['communication_relationship_scores']['Row'];
export type RiskFilter = 'all' | 'low' | 'medium' | 'high' | 'critical';

export function useRelationshipHealth(entityType?: string, riskFilter?: RiskFilter) {
  const [relationships, setRelationships] = useState<RelationshipScoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    healthy: 0,
    needsAttention: 0,
    atRisk: 0,
    critical: 0
  });

  const fetchRelationships = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('communication_relationship_scores')
        .select('*')
        .order('risk_level', { ascending: false })
        .order('days_since_contact', { ascending: false, nullsFirst: false });

      if (entityType) {
        query = query.eq('entity_type', entityType as RelationshipScoreRow['entity_type']);
      }

      if (riskFilter && riskFilter !== 'all') {
        query = query.eq('risk_level', riskFilter);
      }

      const { data, error } = await query.limit(200);

      if (error) throw error;
      
      const typedData = data || [];
      setRelationships(typedData);

      // Calculate stats
      const statsData = {
        total: typedData.length,
        healthy: typedData.filter(r => r.risk_level === 'low').length,
        needsAttention: typedData.filter(r => r.risk_level === 'medium').length,
        atRisk: typedData.filter(r => r.risk_level === 'high').length,
        critical: typedData.filter(r => r.risk_level === 'critical').length
      };
      setStats(statsData);
    } catch (err: any) {
      console.error('Error fetching relationship health:', err);
    } finally {
      setLoading(false);
    }
  }, [entityType, riskFilter]);

  const getRelationshipScore = useCallback(async (type: string, id: string) => {
    try {
      const { data, error } = await supabase
        .from('communication_relationship_scores')
        .select('*')
        .eq('entity_type', type as RelationshipScoreRow['entity_type'])
        .eq('entity_id', id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (err: any) {
      console.error('Error fetching relationship score:', err);
      return null;
    }
  }, []);

  const generateInsights = useCallback(async (type: string, id: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-relationship-insights', {
        body: { entity_type: type, entity_id: id }
      });

      if (error) throw error;
      notify.success('Insights generated', { description: 'AI analysis complete' });
      return data;
    } catch (err: any) {
      notify.error('Failed to generate insights', { description: err.message });
      return null;
    }
  }, []);

  const recalculateScore = useCallback(async (type: string, id: string) => {
    try {
      await supabase.functions.invoke('sync-communication-to-unified', {
        body: { recalculate_only: true, entity_type: type, entity_id: id }
      });
      
      await fetchRelationships();
      notify.success('Score updated', { description: 'Relationship score recalculated' });
    } catch (err: any) {
      notify.error('Recalculation failed', { description: err.message });
    }
  }, [fetchRelationships]);

  useEffect(() => {
    fetchRelationships();

    const channel = supabase
      .channel('relationship_scores_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'communication_relationship_scores' }, () => {
        fetchRelationships();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchRelationships]);

  return {
    relationships,
    loading,
    stats,
    refetch: fetchRelationships,
    getRelationshipScore,
    generateInsights,
    recalculateScore
  };
}

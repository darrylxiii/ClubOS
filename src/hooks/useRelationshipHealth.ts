import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notify';

export type RiskFilter = 'all' | 'low' | 'medium' | 'high' | 'critical';

export interface RelationshipHealthItem {
  id: string;
  entity_type: string;
  entity_id: string;
  owner_id: string;
  entity_name: string;
  entity_email?: string;
  entity_avatar?: string;
  total_communications: number;
  inbound_count: number;
  outbound_count: number;
  engagement_score: number;
  response_rate: number;
  avg_sentiment: number;
  sentiment_trend: string;
  last_inbound_at?: string;
  last_outbound_at?: string;
  days_since_contact: number;
  risk_level: string;
  health_score: number;
  recommended_action?: string;
  preferred_channel?: string;
}

export function useRelationshipHealth(entityType?: string, riskFilter?: RiskFilter) {
  const [relationships, setRelationships] = useState<RelationshipHealthItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    healthy: 0,
    needsAttention: 0,
    atRisk: 0,
    critical: 0
  });

  // Client-side resolution fallback
  const resolveEntityNames = async (data: any[]): Promise<RelationshipHealthItem[]> => {
    const candidateIds = data.filter(r => r.entity_type === 'candidate').map(r => r.entity_id);
    const prospectIds = data.filter(r => r.entity_type === 'prospect').map(r => r.entity_id);
    const companyIds = data.filter(r => r.entity_type === 'company').map(r => r.entity_id);
    // Internal entity_ids are actually conversation_ids - look them up in conversations table
    const internalConversationIds = data.filter(r => r.entity_type === 'internal').map(r => r.entity_id);
    // Partner/stakeholder still use profiles table
    const profileIds = data.filter(r =>
      ['partner', 'stakeholder'].includes(r.entity_type)
    ).map(r => r.entity_id);

    const [candidatesRes, prospectsRes, companiesRes, conversationsRes, profilesRes] = await Promise.all([
      candidateIds.length > 0 ? supabase.from('candidate_profiles').select('id, full_name, avatar_url').in('id', candidateIds) : { data: [] },
      prospectIds.length > 0 ? supabase.from('crm_prospects').select('id, full_name, email').in('id', prospectIds) : { data: [] },
      companyIds.length > 0 ? supabase.from('companies').select('id, name, logo_url').in('id', companyIds) : { data: [] },
      internalConversationIds.length > 0 ? supabase.from('conversations').select('id, title').in('id', internalConversationIds) : { data: [] },
      profileIds.length > 0 ? supabase.from('profiles').select('id, full_name, avatar_url, email').in('id', profileIds) : { data: [] }
    ]);

    const nameMap: Record<string, { name: string | null; avatar?: string | null; email?: string | null }> = {};
    (candidatesRes.data || []).forEach(c => { nameMap[c.id] = { name: c.full_name, avatar: c.avatar_url }; });
    (prospectsRes.data || []).forEach(p => { nameMap[p.id] = { name: p.full_name, email: p.email }; });
    (companiesRes.data || []).forEach(c => { nameMap[c.id] = { name: c.name, avatar: c.logo_url }; });
    // Map conversation titles for internal entities
    (conversationsRes.data || []).forEach(conv => { nameMap[conv.id] = { name: conv.title }; });
    (profilesRes.data || []).forEach(p => { nameMap[p.id] = { name: p.full_name, avatar: p.avatar_url, email: p.email }; });

    // Fallback: Check profiles table for unresolved candidates (entity_id might be user_id, not candidate_profile id)
    const unresolvedCandidateIds = candidateIds.filter(id => !nameMap[id]);
    if (unresolvedCandidateIds.length > 0) {
      const { data: profileFallbacks } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .in('id', unresolvedCandidateIds);
      
      (profileFallbacks || []).forEach(p => {
        nameMap[p.id] = { name: p.full_name, avatar: p.avatar_url, email: p.email };
      });
    }

    return data.map(r => {
      const details = nameMap[r.entity_id] || { name: null, avatar: null, email: null };
      let fallbackName = 'Unknown Entity';

      // Smart fallback with ID fragment if resolution fails
      if (!details.name) {
        const idFragment = r.entity_id?.slice(0, 8) || '???';
        switch (r.entity_type) {
          case 'internal': fallbackName = `Internal User (${idFragment})`; break;
          case 'partner': fallbackName = `Partner (${idFragment})`; break;
          case 'stakeholder': fallbackName = `Stakeholder (${idFragment})`; break;
          case 'candidate': fallbackName = `Candidate (${idFragment})`; break;
          case 'prospect': fallbackName = `Prospect (${idFragment})`; break;
          case 'company': fallbackName = `Company (${idFragment})`; break;
          default: fallbackName = `${r.entity_type} (${idFragment})`;
        }
      }

      return {
        ...r,
        entity_name: details.name || fallbackName,
        entity_avatar: details.avatar,
        entity_email: details.email
      };
    });
  };

  const updateStats = (data: RelationshipHealthItem[]) => {
    setStats({
      total: data.length,
      healthy: data.filter(r => r.risk_level === 'low').length,
      needsAttention: data.filter(r => r.risk_level === 'medium').length,
      atRisk: data.filter(r => r.risk_level === 'high').length,
      critical: data.filter(r => r.risk_level === 'critical').length
    });
  };

  const fetchRelationships = useCallback(async () => {
    try {
      setLoading(true);

      // Fallback: Client-side fetch (RPC may not exist)
      let query = supabase
        .from('communication_relationship_scores')
        .select('*')
        .order('risk_level', { ascending: false })
        .order('days_since_contact', { ascending: false, nullsFirst: false });

      if (entityType && entityType !== 'all') {
        query = query.eq('entity_type', entityType as any);
      }

      if (riskFilter && riskFilter !== 'all') {
        query = query.eq('risk_level', riskFilter);
      }

      const { data: rawData, error: rawError } = await query.limit(200);

      if (rawError) throw rawError;

      const enrichedData = await resolveEntityNames(rawData || []);
      
      // Deduplicate by entity_type + entity_id, keeping highest total_communications
      const deduped = Object.values(
        enrichedData.reduce((acc, item) => {
          const key = `${item.entity_type}:${item.entity_id}`;
          if (!acc[key] || item.total_communications > acc[key].total_communications) {
            acc[key] = item;
          }
          return acc;
        }, {} as Record<string, RelationshipHealthItem>)
      );
      
      setRelationships(deduped);
      updateStats(deduped);

    } catch (err: unknown) {
      console.error('Error fetching relationship health:', err);
      // Even in error, clear loading state
    } finally {
      setLoading(false);
    }
  }, [entityType, riskFilter]);

  const getRelationshipScore = useCallback(async (type: string, id: string) => {
    // This can still query the raw table for specific details if needed, 
    // or we could make another RPC. For now keeping raw query for single item is fine.
    try {
      const { data, error } = await supabase
        .from('communication_relationship_scores')
        .select('*')
        .eq('entity_type', type as any)
        .eq('entity_id', id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (err: unknown) {
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
    } catch (err: unknown) {
      notify.error('Failed to generate insights', { description: err instanceof Error ? err.message : 'Unknown error' });
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
    } catch (err: unknown) {
      notify.error('Recalculation failed', { description: err instanceof Error ? err.message : 'Unknown error' });
    }
  }, [fetchRelationships]);

  useEffect(() => {
    fetchRelationships();

    // Subscribe to changes
    const channel = supabase
      .channel('relationship_scores_changes_v2')
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

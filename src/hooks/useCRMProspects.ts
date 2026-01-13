import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notify';
import type { CRMProspect, ProspectStage } from '@/types/crm-enterprise';

interface UseProspectsOptions {
  campaignId?: string;
  stage?: ProspectStage;
  ownerId?: string;
  search?: string;
  limit?: number;
  minScore?: number;
  maxScore?: number;
}

export function useCRMProspects(options: UseProspectsOptions = {}) {
  const [prospects, setProspects] = useState<CRMProspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProspects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('crm_prospects')
        .select(`
          *,
          owner:profiles!crm_prospects_owner_id_fkey(full_name, avatar_url),
          campaign:crm_campaigns!crm_prospects_campaign_id_fkey(name)
        `)
        .eq('entity_type', 'prospect')
        // Sort approach might need adjustment if sorting by JSON field, but 'last_activity_at' isn't in top level of schema 1.2?
        // Checking schema: crm_prospects has 'updated_at', 'created_at'.
        // engagement_metrics has 'last_contacted_at'.
        // Schema 1.3 `crm_activities` has `performed_at`.
        // Ideally we sort by updated_at or use a dedicated column if we added one. 
        // For now, sorting by updated_at as proxy or removing sort if invalid column.
        .order('updated_at', { ascending: false });

      if (options.campaignId) {
        query = query.eq('campaign_id', options.campaignId);
      }

      if (options.stage) {
        query = query.eq('status', options.stage); // 'status' maps to 'stage'
      }

      if (options.ownerId) {
        query = query.eq('owner_id', options.ownerId);
      }

      if (options.search) {
        query = query.or(`full_name.ilike.%${options.search}%,email.ilike.%${options.search}%,company_name.ilike.%${options.search}%`);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.minScore !== undefined) {
        query = query.gte('lead_score', options.minScore);
      }

      if (options.maxScore !== undefined) {
        query = query.lte('lead_score', options.maxScore);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const mappedProspects: CRMProspect[] = (data || []).map((p: any) => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        phone: p.phone,
        linkedin_url: p.linkedin_url,
        company_name: p.company_name,
        company_id: p.company_id,
        stage: p.status as any, // Mapped status -> stage
        lead_score: p.lead_score,
        owner_id: p.owner_id,
        campaign_id: p.campaign_id,
        external_id: p.external_id,
        created_at: p.created_at,
        updated_at: p.updated_at,

        // JSONB Unpacking
        job_title: p.data?.job_title || null,
        industry: p.data?.industry || null,
        location: p.data?.location || null,
        country: p.data?.country || null,
        notes: p.data?.notes || null,
        tags: p.data?.tags || [],

        // Metrics Unpacking
        emails_sent: p.engagement_metrics?.emails_sent || 0,
        emails_opened: p.engagement_metrics?.emails_opened || 0,
        last_contacted_at: p.engagement_metrics?.last_contacted_at || null,

        // Joined
        owner_name: p.owner?.full_name,
        owner_avatar: p.owner?.avatar_url,
        campaign_name: p.campaign?.name,

        // Defaults for missing logic/fields in MVP schema
        first_name: p.full_name.split(' ')[0],
        last_name: p.full_name.split(' ').slice(1).join(' '),
        email_status: 'unknown',
        source: 'manual',
        engagement_score: 0,
        emails_clicked: 0,
        emails_replied: 0,
        last_opened_at: null,
        last_replied_at: null,
        last_activity_at: p.updated_at,
        next_followup_at: null,
        reply_sentiment: null,
        qualified_reason: null,
        disqualified_reason: null,
        deal_value: null,
        currency: 'USD',
        close_probability: 0,
        expected_close_date: null,
        assigned_at: null,
        custom_fields: {},
        stakeholder_id: null,
        contact_id: null,
      }));

      setProspects(mappedProspects);
    } catch (err) {
      console.error('Error fetching prospects:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [options.campaignId, options.stage, options.ownerId, options.search, options.limit, options.minScore, options.maxScore]);

  useEffect(() => {
    fetchProspects();
  }, [fetchProspects]);

  const updateProspectStage = async (prospectId: string, newStage: ProspectStage) => {
    try {
      const { error: updateError } = await supabase
        .from('crm_prospects')
        .update({
          status: newStage, // Mapping stage -> status
          updated_at: new Date().toISOString(),
        })
        .eq('id', prospectId);

      if (updateError) throw updateError;

      setProspects(prev =>
        prev.map(p => p.id === prospectId ? { ...p, stage: newStage } : p)
      );

      notify.success('Stage updated', { description: `Prospect moved to ${newStage}` });
    } catch (err) {
      console.error('Error updating prospect stage:', err);
      notify.error('Error', { description: 'Failed to update prospect stage' });
    }
  };

  const updateProspect = async (prospectId: string, updates: Partial<CRMProspect>) => {
    try {
      // NOTE: Deep updates for data/metrics would require more logic.
      // For now assuming top-level updates.
      // If updating 'job_title' inside 'data', we need to fetch current, merge, update.
      // OR use postgres jsonb_set. 
      // Simplified: We only support top-level updates (map stage->status) for now in this MVP hook.

      const mappedUpdates: any = { ...updates };
      if (updates.stage) mappedUpdates.status = updates.stage;
      delete mappedUpdates.stage; // Remove mapped key

      const { error: updateError } = await supabase
        .from('crm_prospects')
        .update({
          ...mappedUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', prospectId);

      if (updateError) throw updateError;

      setProspects(prev =>
        prev.map(p => p.id === prospectId ? { ...p, ...updates } : p)
      );

      return true;
    } catch (err) {
      console.error('Error updating prospect:', err);
      notify.error('Error', { description: 'Failed to update prospect' });
      return false;
    }
  };

  const deleteProspect = async (prospectId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('crm_prospects')
        .delete()
        .eq('id', prospectId);

      if (deleteError) throw deleteError;

      setProspects(prev => prev.filter(p => p.id !== prospectId));

      notify.success('Prospect deleted', { description: 'The prospect has been removed' });

      return true;
    } catch (err) {
      console.error('Error deleting prospect:', err);
      notify.error('Error', { description: 'Failed to delete prospect' });
      return false;
    }
  };

  return {
    prospects,
    loading,
    error,
    refetch: fetchProspects,
    updateProspectStage,
    updateProspect,
    deleteProspect,
  };
}

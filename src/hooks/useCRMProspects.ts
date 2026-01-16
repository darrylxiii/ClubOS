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

      const { data: rawData, error: fetchError } = await (supabase as any)
        .from('crm_prospects')
        .select(`
          *,
          owner:profiles!crm_prospects_owner_id_fkey(full_name, avatar_url),
          campaign:crm_campaigns!crm_prospects_campaign_id_fkey(name)
        `)
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Apply client-side filters for complex conditions to avoid type issues
      let filteredData: any[] = rawData || [];

      if (options.campaignId) {
        filteredData = filteredData.filter((p: any) => p.campaign_id === options.campaignId);
      }

      if (options.stage) {
        filteredData = filteredData.filter((p: any) => p.stage === options.stage);
      }

      if (options.ownerId) {
        filteredData = filteredData.filter((p: any) => p.owner_id === options.ownerId);
      }

      if (options.search) {
        const searchLower = options.search.toLowerCase();
        filteredData = filteredData.filter((p: any) =>
          p.full_name?.toLowerCase().includes(searchLower) ||
          p.email?.toLowerCase().includes(searchLower) ||
          p.company_name?.toLowerCase().includes(searchLower)
        );
      }

      if (options.limit) {
        filteredData = filteredData.slice(0, options.limit);
      }

      if (options.minScore !== undefined) {
        filteredData = filteredData.filter((p: any) => (p.lead_score || 0) >= options.minScore!);
      }

      if (options.maxScore !== undefined) {
        filteredData = filteredData.filter((p: any) => (p.lead_score || 0) <= options.maxScore!);
      }

      const mappedProspects: CRMProspect[] = (filteredData as any[]).map((p: any) => {
        const pData = (p.data as Record<string, any>) || {};
        const engagementMetrics = (p.engagement_metrics as Record<string, any>) || {};
        return {
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          phone: p.phone,
          linkedin_url: p.linkedin_url,
          company_name: p.company_name,
          company_id: p.company_id,
          company_domain: pData.company_domain || null,
          company_size: pData.company_size || null,
          stage: p.stage as any,
          lead_score: p.lead_score,
          owner_id: p.owner_id,
          campaign_id: p.campaign_id,
          external_id: p.external_id,
          created_at: p.created_at,
          updated_at: p.updated_at,

          // JSONB Unpacking
          job_title: pData.job_title || null,
          industry: pData.industry || null,
          location: pData.location || null,
          country: pData.country || null,
          notes: pData.notes || null,
          tags: pData.tags || [],

          // Metrics Unpacking
          emails_sent: engagementMetrics.emails_sent || 0,
          emails_opened: engagementMetrics.emails_opened || 0,
          last_contacted_at: engagementMetrics.last_contacted_at || null,

          // Joined
          owner_name: p.owner?.full_name,
          owner_avatar: p.owner?.avatar_url,
          campaign_name: p.campaign?.name,

          // Defaults for missing logic/fields in MVP schema
          first_name: p.full_name?.split(' ')[0] || '',
          last_name: p.full_name?.split(' ').slice(1).join(' ') || '',
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
          health_score: 0,
          health_trend: 'stable',
          last_enriched_at: null,
        };
      });

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
          stage: newStage,
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

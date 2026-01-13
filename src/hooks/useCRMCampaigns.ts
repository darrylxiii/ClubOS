import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notify';
import type { CRMCampaign } from '@/types/crm-enterprise';

interface UseCampaignsOptions {
  status?: string;
  ownerId?: string;
  limit?: number;
}

export function useCRMCampaigns(options: UseCampaignsOptions = {}) {
  const [campaigns, setCampaigns] = useState<CRMCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('crm_campaigns_unified')
        .select(`
          *,
          owner:profiles!crm_campaigns_unified_owner_id_fkey(full_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (options.status) {
        query = query.eq('status', options.status);
      }

      if (options.ownerId) {
        query = query.eq('owner_id', options.ownerId);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const mappedCampaigns: CRMCampaign[] = (data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        source: c.source as any,
        external_id: c.external_id,
        status: c.status as any,
        target_persona: c.target_audience?.persona || null,
        target_industry: c.target_audience?.industry ? [c.target_audience.industry] : null,
        target_company_size: c.target_audience?.company_size ? [c.target_audience.company_size] : null,
        sequence_steps: c.config?.sequence_steps || 0,
        total_prospects: c.metrics?.prospects || 0,
        total_sent: c.metrics?.sent || 0,
        total_opens: c.metrics?.opens || 0,
        total_replies: c.metrics?.replies || 0,
        total_bounces: c.metrics?.bounces || 0,
        reply_rate: c.metrics?.reply_rate || 0,
        open_rate: c.metrics?.open_rate || 0,
        start_date: c.config?.start_date || null,
        end_date: c.config?.end_date || null,
        owner_id: c.owner_id,
        company_id: c.company_id,
        metadata: c.metadata || {},
        created_at: c.created_at,
        updated_at: c.updated_at,
        owner_name: c.owner?.full_name,
        owner_avatar: c.owner?.avatar_url,
      }));

      setCampaigns(mappedCampaigns);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [options.status, options.ownerId, options.limit]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const createCampaign = async (campaign: Partial<CRMCampaign>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: createError } = await supabase
        .from('crm_campaigns_unified')
        .insert({
          name: campaign.name || 'New Campaign',
          description: campaign.description,
          source: campaign.source || 'instantly',
          status: campaign.status || 'draft',
          target_audience: {
            persona: campaign.target_persona,
            industry: campaign.target_industry?.[0], // Simplified mapping
            company_size: campaign.target_company_size?.[0],
          },
          config: {
            start_date: campaign.start_date,
            sequence_steps: campaign.sequence_steps,
          },
          owner_id: user.id,
          company_id: campaign.company_id,
        })
        .select()
        .single();

      if (createError) throw createError;

      const normalizedCampaign: CRMCampaign = {
        id: data.id,
        name: data.name,
        description: data.description,
        source: data.source as any,
        external_id: data.external_id,
        status: data.status as any,
        target_persona: data.target_audience?.persona || null,
        target_industry: data.target_audience?.industry ? [data.target_audience.industry] : null,
        target_company_size: data.target_audience?.company_size ? [data.target_audience.company_size] : null,
        sequence_steps: data.config?.sequence_steps || 0,
        total_prospects: 0,
        total_sent: 0,
        total_opens: 0,
        total_replies: 0,
        total_bounces: 0,
        reply_rate: 0,
        open_rate: 0,
        start_date: data.config?.start_date || null,
        end_date: data.config?.end_date || null,
        owner_id: data.owner_id,
        company_id: data.company_id,
        metadata: data.metadata || {},
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      setCampaigns(prev => [normalizedCampaign, ...prev]);

      notify.success('Campaign created', {
        description: `Campaign "${data.name}" has been created`,
      });

      return data;
    } catch (err) {
      console.error('Error creating campaign:', err);
      notify.error('Error', { description: 'Failed to create campaign' });
      return null;
    }
  };

  const updateCampaign = async (campaignId: string, updates: Partial<CRMCampaign>) => {
    try {
      // Prepare updates for unified schema
      const unifiedUpdates: any = {
        name: updates.name,
        description: updates.description,
        status: updates.status,
        updated_at: new Date().toISOString(),
      };

      if (updates.target_persona || updates.target_industry) {
        unifiedUpdates.target_audience = {
          persona: updates.target_persona,
          industry: updates.target_industry?.[0],
          company_size: updates.target_company_size?.[0],
        }; // Note: This is a partial replace, might need deep merge in real app
      }

      const { error: updateError } = await supabase
        .from('crm_campaigns_unified')
        .update(unifiedUpdates)
        .eq('id', campaignId);

      if (updateError) throw updateError;

      setCampaigns(prev =>
        prev.map(c => c.id === campaignId ? { ...c, ...updates } : c)
      );

      return true;
    } catch (err) {
      console.error('Error updating campaign:', err);
      notify.error('Error', { description: 'Failed to update campaign' });
      return false;
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('crm_campaigns_unified')
        .delete()
        .eq('id', campaignId);

      if (deleteError) throw deleteError;

      setCampaigns(prev => prev.filter(c => c.id !== campaignId));

      notify.success('Campaign deleted', { description: 'The campaign has been removed' });

      return true;
    } catch (err) {
      console.error('Error deleting campaign:', err);
      notify.error('Error', { description: 'Failed to delete campaign' });
      return false;
    }
  };

  return {
    campaigns,
    loading,
    error,
    refetch: fetchCampaigns,
    createCampaign,
    updateCampaign,
    deleteCampaign,
  };
}

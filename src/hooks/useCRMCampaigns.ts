import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
  const { toast } = useToast();

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('crm_campaigns')
        .select(`
          *,
          owner:profiles!crm_campaigns_owner_id_fkey(full_name, avatar_url)
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
        ...c,
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
        .from('crm_campaigns')
        .insert({
          name: campaign.name || 'New Campaign',
          description: campaign.description,
          source: campaign.source || 'instantly',
          status: campaign.status || 'draft',
          target_persona: campaign.target_persona,
          target_industry: campaign.target_industry,
          target_company_size: campaign.target_company_size,
          owner_id: user.id,
          company_id: campaign.company_id,
        })
        .select()
        .single();

      if (createError) throw createError;

      setCampaigns(prev => [data as CRMCampaign, ...prev]);

      toast({
        title: 'Campaign created',
        description: `Campaign "${data.name}" has been created`,
      });

      return data;
    } catch (err) {
      console.error('Error creating campaign:', err);
      toast({
        title: 'Error',
        description: 'Failed to create campaign',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateCampaign = async (campaignId: string, updates: Partial<CRMCampaign>) => {
    try {
      const { error: updateError } = await supabase
        .from('crm_campaigns')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaignId);

      if (updateError) throw updateError;

      setCampaigns(prev =>
        prev.map(c => c.id === campaignId ? { ...c, ...updates } : c)
      );

      return true;
    } catch (err) {
      console.error('Error updating campaign:', err);
      toast({
        title: 'Error',
        description: 'Failed to update campaign',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('crm_campaigns')
        .delete()
        .eq('id', campaignId);

      if (deleteError) throw deleteError;

      setCampaigns(prev => prev.filter(c => c.id !== campaignId));

      toast({
        title: 'Campaign deleted',
        description: 'The campaign has been removed',
      });

      return true;
    } catch (err) {
      console.error('Error deleting campaign:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete campaign',
        variant: 'destructive',
      });
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

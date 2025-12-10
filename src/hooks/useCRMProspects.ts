import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
  const { toast } = useToast();

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
        .order('last_activity_at', { ascending: false, nullsFirst: false });

      if (options.campaignId) {
        query = query.eq('campaign_id', options.campaignId);
      }

      if (options.stage) {
        query = query.eq('stage', options.stage);
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
        query = query.gte('composite_score', options.minScore);
      }

      if (options.maxScore !== undefined) {
        query = query.lte('composite_score', options.maxScore);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const mappedProspects: CRMProspect[] = (data || []).map((p: any) => ({
        ...p,
        owner_name: p.owner?.full_name,
        owner_avatar: p.owner?.avatar_url,
        campaign_name: p.campaign?.name,
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
          stage: newStage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', prospectId);

      if (updateError) throw updateError;

      setProspects(prev => 
        prev.map(p => p.id === prospectId ? { ...p, stage: newStage } : p)
      );

      toast({
        title: 'Stage updated',
        description: `Prospect moved to ${newStage}`,
      });
    } catch (err) {
      console.error('Error updating prospect stage:', err);
      toast({
        title: 'Error',
        description: 'Failed to update prospect stage',
        variant: 'destructive',
      });
    }
  };

  const updateProspect = async (prospectId: string, updates: Partial<CRMProspect>) => {
    try {
      const { error: updateError } = await supabase
        .from('crm_prospects')
        .update({ 
          ...updates,
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
      toast({
        title: 'Error',
        description: 'Failed to update prospect',
        variant: 'destructive',
      });
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

      toast({
        title: 'Prospect deleted',
        description: 'The prospect has been removed',
      });

      return true;
    } catch (err) {
      console.error('Error deleting prospect:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete prospect',
        variant: 'destructive',
      });
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

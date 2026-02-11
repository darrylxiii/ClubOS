import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notify';

export interface CRMDeal {
  id: string;
  prospect_id: string;
  title: string;
  value: number;
  currency: string;
  stage: 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  probability: number;
  expected_close_date: string | null;
  actual_close_date: string | null;
  owner_id: string | null;
  company_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  prospect_name?: string;
  prospect_company?: string;
  owner_name?: string;
}

export interface DealMetrics {
  totalDeals: number;
  totalValue: number;
  weightedValue: number;
  avgDealSize: number;
  wonDeals: number;
  wonValue: number;
  lostDeals: number;
  winRate: number;
  avgSalesClycle: number;
}

interface UseDealsOptions {
  prospectId?: string;
  stage?: string;
  ownerId?: string;
  limit?: number;
}

export function useCRMDeals(options: UseDealsOptions = {}) {
  const [deals, setDeals] = useState<CRMDeal[]>([]);
  const [metrics, setMetrics] = useState<DealMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDeals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch prospects with deal data instead of separate deals table
      let query = supabase
        .from('crm_prospects')
        .select(`
          id,
          full_name,
          company_name,
          deal_value,
          currency,
          stage,
          close_probability,
          expected_close_date,
          owner_id,
          created_at,
          updated_at,
          owner:profiles!crm_prospects_owner_id_fkey(full_name)
        `)
        .not('deal_value', 'is', null)
        .gt('deal_value', 0)
        .order('deal_value', { ascending: false });

      if (options.prospectId) {
        query = query.eq('id', options.prospectId);
      }

      if (options.stage) {
        query = query.eq('stage', options.stage);
      }

      if (options.ownerId) {
        query = query.eq('owner_id', options.ownerId);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const mappedDeals: CRMDeal[] = (data || []).map((p: any) => ({
        id: p.id,
        prospect_id: p.id,
        title: `${p.full_name} - ${p.company_name || 'Unknown Company'}`,
        value: p.deal_value || 0,
        currency: p.currency || 'EUR',
        stage: mapProspectStageToDealStage(p.stage),
        probability: p.close_probability || 0,
        expected_close_date: p.expected_close_date,
        actual_close_date: p.stage === 'closed_won' ? p.updated_at : null,
        owner_id: p.owner_id,
        company_id: null,
        notes: null,
        created_at: p.created_at,
        updated_at: p.updated_at,
        prospect_name: p.full_name,
        prospect_company: p.company_name,
        owner_name: p.owner?.full_name,
      }));

      setDeals(mappedDeals);

      // Calculate metrics
      const wonDeals = mappedDeals.filter(d => d.stage === 'closed_won');
      const lostDeals = mappedDeals.filter(d => d.stage === 'closed_lost');
      const openDeals = mappedDeals.filter(d => !['closed_won', 'closed_lost'].includes(d.stage));

      const totalValue = openDeals.reduce((sum, d) => sum + d.value, 0);
      const weightedValue = openDeals.reduce((sum, d) => sum + (d.value * d.probability / 100), 0);
      const wonValue = wonDeals.reduce((sum, d) => sum + d.value, 0);

      setMetrics({
        totalDeals: openDeals.length,
        totalValue,
        weightedValue,
        avgDealSize: openDeals.length > 0 ? totalValue / openDeals.length : 0,
        wonDeals: wonDeals.length,
        wonValue,
        lostDeals: lostDeals.length,
        winRate: wonDeals.length + lostDeals.length > 0
          ? (wonDeals.length / (wonDeals.length + lostDeals.length)) * 100
          : 0,
        avgSalesClycle: 0, // Would need more data to calculate
      });

    } catch (err) {
      console.error('Error fetching deals:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [options.prospectId, options.stage, options.ownerId, options.limit]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const updateDeal = async (dealId: string, updates: Partial<CRMDeal>) => {
    try {
      // Map deal updates back to prospect fields
      const prospectUpdates: Record<string, unknown> = {};
      if (updates.value !== undefined) prospectUpdates.deal_value = updates.value;
      if (updates.probability !== undefined) prospectUpdates.close_probability = updates.probability;
      if (updates.expected_close_date !== undefined) prospectUpdates.expected_close_date = updates.expected_close_date;
      if (updates.stage !== undefined) prospectUpdates.stage = mapDealStageToProspectStage(updates.stage);

      const { error: updateError } = await supabase
        .from('crm_prospects')
        .update({
          ...prospectUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dealId);

      if (updateError) throw updateError;

      await fetchDeals();

      notify.success('Deal updated', {
        description: 'The deal has been updated successfully',
      });

      return true;
    } catch (err) {
      console.error('Error updating deal:', err);
      notify.error('Error', { description: 'Failed to update deal' });
      return false;
    }
  };

  return {
    deals,
    metrics,
    loading,
    error,
    refetch: fetchDeals,
    updateDeal,
  };
}

function mapProspectStageToDealStage(prospectStage: string): CRMDeal['stage'] {
  const stageMap: Record<string, CRMDeal['stage']> = {
    'qualified': 'qualification',
    'meeting_booked': 'qualification',
    'proposal_sent': 'proposal',
    'negotiation': 'negotiation',
    'closed_won': 'closed_won',
    'closed_lost': 'closed_lost',
  };
  return stageMap[prospectStage] || 'qualification';
}

function mapDealStageToProspectStage(dealStage: CRMDeal['stage']): string {
  const stageMap: Record<CRMDeal['stage'], string> = {
    'qualification': 'qualified',
    'proposal': 'proposal_sent',
    'negotiation': 'negotiation',
    'closed_won': 'closed_won',
    'closed_lost': 'closed_lost',
  };
  return stageMap[dealStage];
}

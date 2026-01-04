import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface EnterpriseContract {
  id: string;
  company_id: string | null;
  contract_type: 'standard' | 'enterprise' | 'strategic' | 'partnership';
  contract_number: string | null;
  start_date: string;
  end_date: string | null;
  term_months: number;
  auto_renewal: boolean;
  annual_value: number;
  total_contract_value: number;
  payment_terms_days: number;
  annual_escalator_percent: number;
  status: 'draft' | 'pending_approval' | 'active' | 'expired' | 'cancelled' | 'renewed';
  signed_date: string | null;
  signed_by: string | null;
  terms_accepted: boolean;
  special_terms: Json;
  metadata: Json;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined fields
  company_name?: string;
}

export interface ContractRenewal {
  id: string;
  contract_id: string;
  renewal_date: string;
  previous_annual_value: number | null;
  new_annual_value: number | null;
  escalator_applied: number | null;
  renewal_status: 'pending' | 'renewed' | 'cancelled' | 'upgraded' | 'downgraded';
  renewal_notes: string | null;
  processed_at: string | null;
  created_at: string;
}

export function useEnterpriseContracts(status?: string) {
  return useQuery({
    queryKey: ['enterprise-contracts', status],
    queryFn: async (): Promise<EnterpriseContract[]> => {
      let query = supabase
        .from('enterprise_contracts')
        .select(`
          *,
          companies:company_id (name)
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((contract: any) => ({
        ...contract,
        company_name: contract.companies?.name,
      }));
    },
    staleTime: 30000,
  });
}

export function useActiveContractsValue() {
  return useQuery({
    queryKey: ['enterprise-contracts', 'active-value'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enterprise_contracts')
        .select('annual_value, total_contract_value')
        .eq('status', 'active');

      if (error) throw error;

      const arr = data?.reduce((sum, c) => sum + (c.annual_value || 0), 0) || 0;
      const tcv = data?.reduce((sum, c) => sum + (c.total_contract_value || 0), 0) || 0;
      const count = data?.length || 0;

      return { arr, tcv, count, avgContractValue: count > 0 ? arr / count : 0 };
    },
    staleTime: 30000,
  });
}

export function useContractRenewals(contractId?: string) {
  return useQuery({
    queryKey: ['contract-renewals', contractId],
    queryFn: async (): Promise<ContractRenewal[]> => {
      let query = supabase
        .from('contract_renewals')
        .select('*')
        .order('renewal_date', { ascending: false });

      if (contractId) {
        query = query.eq('contract_id', contractId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ContractRenewal[];
    },
    enabled: !!contractId || contractId === undefined,
    staleTime: 30000,
  });
}

export function useUpcomingRenewals(daysAhead: number = 90) {
  return useQuery({
    queryKey: ['enterprise-contracts', 'upcoming-renewals', daysAhead],
    queryFn: async (): Promise<EnterpriseContract[]> => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const { data, error } = await supabase
        .from('enterprise_contracts')
        .select(`
          *,
          companies:company_id (name)
        `)
        .eq('status', 'active')
        .eq('auto_renewal', true)
        .lte('end_date', futureDate.toISOString().split('T')[0])
        .order('end_date', { ascending: true });

      if (error) throw error;

      return (data || []).map((contract: any) => ({
        ...contract,
        company_name: contract.companies?.name,
      }));
    },
    staleTime: 60000,
  });
}

export interface CreateContractInput {
  company_id?: string;
  contract_type?: string;
  start_date: string;
  end_date?: string;
  term_months?: number;
  auto_renewal?: boolean;
  annual_value?: number;
  total_contract_value?: number;
  payment_terms_days?: number;
  annual_escalator_percent?: number;
  status?: string;
  signed_by?: string;
  special_terms?: Json;
  metadata?: Json;
}

export function useCreateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contract: CreateContractInput) => {
      const { data, error } = await supabase
        .from('enterprise_contracts')
        .insert([contract])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprise-contracts'] });
    },
  });
}

export interface UpdateContractInput {
  id: string;
  company_id?: string;
  contract_type?: string;
  start_date?: string;
  end_date?: string;
  term_months?: number;
  auto_renewal?: boolean;
  annual_value?: number;
  total_contract_value?: number;
  payment_terms_days?: number;
  annual_escalator_percent?: number;
  status?: string;
  signed_by?: string;
  signed_date?: string;
  terms_accepted?: boolean;
  special_terms?: Json;
  metadata?: Json;
}

export function useUpdateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateContractInput) => {
      const { data, error } = await supabase
        .from('enterprise_contracts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprise-contracts'] });
    },
  });
}

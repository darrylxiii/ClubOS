import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CommissionTier {
  id: string;
  name: string;
  min_revenue: number;
  max_revenue: number | null;
  percentage: number;
  is_default: boolean;
  created_at: string;
}

export interface CommissionPayout {
  id: string;
  employee_id: string;
  amount: number;
  status: 'pending' | 'scheduled' | 'paid';
  scheduled_date: string | null;
  paid_date: string | null;
  payment_reference: string | null;
  created_at: string;
}

export function useCommissionTiers() {
  return useQuery({
    queryKey: ['commission-tiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commission_tiers')
        .select('*')
        .order('min_revenue', { ascending: true });

      if (error) throw error;
      return (data || []) as CommissionTier[];
    },
  });
}

export function useCreateCommissionTier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tier: Omit<CommissionTier, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('commission_tiers')
        .insert(tier)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-tiers'] });
    },
  });
}

export function useUpdateCommissionTier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CommissionTier> & { id: string }) => {
      const { data, error } = await supabase
        .from('commission_tiers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-tiers'] });
    },
  });
}

export function useDeleteCommissionTier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('commission_tiers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-tiers'] });
    },
  });
}

export function useCommissionPayouts(status?: string) {
  return useQuery({
    queryKey: ['commission-payouts', status],
    queryFn: async () => {
      let query = supabase
        .from('employee_commissions')
        .select(`
          *,
          employee_profiles(id, user_id, profiles:user_id(full_name, email))
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useSchedulePayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, scheduledDate }: { ids: string[]; scheduledDate: string }) => {
      const { error } = await supabase
        .from('employee_commissions')
        .update({ 
          status: 'scheduled',
          scheduled_payout_date: scheduledDate 
        })
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-payouts'] });
    },
  });
}

export function useMarkPayoutPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, paymentReference }: { ids: string[]; paymentReference: string }) => {
      const { error } = await supabase
        .from('employee_commissions')
        .update({ 
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_reference: paymentReference 
        })
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-payouts'] });
    },
  });
}

export function exportCommissionsToCSV(commissions: any[]) {
  const headers = ['Employee', 'Amount', 'Status', 'Scheduled Date', 'Paid Date', 'Reference'];
  const rows = commissions.map(c => [
    c.employee_profiles?.profiles?.full_name || 'Unknown',
    c.gross_amount || c.amount,
    c.status,
    c.scheduled_payout_date || '',
    c.paid_at || '',
    c.payment_reference || '',
  ]);

  const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `commissions-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

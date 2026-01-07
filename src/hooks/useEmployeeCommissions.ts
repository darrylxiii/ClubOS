import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EmployeeCommission {
  id: string;
  employee_id: string;
  source_type: string;
  source_id: string;
  placement_fee_id: string | null;
  placement_fee_base: number | null;
  gross_amount: number;
  net_amount: number;
  commission_rate: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  approved_by: string | null;
  approved_at: string | null;
  paid_at: string | null;
  payment_reference: string | null;
  candidate_name: string | null;
  company_name: string | null;
  job_title: string | null;
  period_date: string | null;
  notes: string | null;
  commission_type: string | null;
  split_percentage: number | null;
  created_at: string;
  updated_at: string;
  // Joined data
  employee_name?: string;
}

export const useEmployeeCommissions = (year?: number) => {
  return useQuery({
    queryKey: ['employee-commissions', year],
    queryFn: async () => {
      let query = supabase
        .from('employee_commissions')
        .select(`
          *,
          employee_profiles!inner (
            user_id,
            profiles!inner (
              full_name
            )
          )
        `)
        .order('created_at', { ascending: false });
      
      if (year) {
        query = query
          .gte('period_date', `${year}-01-01`)
          .lte('period_date', `${year}-12-31`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Transform to include employee_name
      return (data || []).map((commission: any) => ({
        ...commission,
        employee_name: commission.employee_profiles?.profiles?.full_name || 'Unknown',
      })) as EmployeeCommission[];
    },
  });
};

export const useCommissionStats = (year?: number) => {
  return useQuery({
    queryKey: ['commission-stats', year],
    queryFn: async () => {
      let query = supabase
        .from('employee_commissions')
        .select('gross_amount, status');
      
      if (year) {
        query = query
          .gte('period_date', `${year}-01-01`)
          .lte('period_date', `${year}-12-31`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      const commissions = data || [];
      
      return {
        totalCommissions: commissions.reduce((sum, c) => sum + (c.gross_amount || 0), 0),
        pendingCommissions: commissions
          .filter(c => c.status === 'pending')
          .reduce((sum, c) => sum + (c.gross_amount || 0), 0),
        approvedCommissions: commissions
          .filter(c => c.status === 'approved')
          .reduce((sum, c) => sum + (c.gross_amount || 0), 0),
        paidCommissions: commissions
          .filter(c => c.status === 'paid')
          .reduce((sum, c) => sum + (c.gross_amount || 0), 0),
        pendingCount: commissions.filter(c => c.status === 'pending').length,
        totalCount: commissions.length,
      };
    },
  });
};

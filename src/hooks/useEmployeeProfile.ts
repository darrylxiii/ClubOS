import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EmployeeProfile {
  id: string;
  user_id: string;
  employee_number: string | null;
  department: string | null;
  job_title: string;
  manager_id: string | null;
  employment_type: string;
  start_date: string | null;
  base_salary: number | null;
  salary_currency: string;
  commission_structure: string;
  commission_percentage: number;
  annual_bonus_target: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  manager?: Partial<EmployeeProfile>;
  profile?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export interface EmployeeTarget {
  id: string;
  employee_id: string;
  period_type: string;
  period_start: string;
  period_end: string;
  revenue_target: number | null;
  placements_target: number | null;
  hours_target: number | null;
  interviews_target: number | null;
  candidates_sourced_target: number | null;
  revenue_achieved: number;
  placements_achieved: number;
  hours_achieved: number;
  interviews_achieved: number;
  candidates_sourced_achieved: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeCommission {
  id: string;
  employee_id: string;
  source_type: string;
  source_id: string | null;
  gross_amount: number;
  net_amount: number | null;
  placement_fee_base: number | null;
  commission_rate: number | null;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  paid_at: string | null;
  payment_reference: string | null;
  candidate_name: string | null;
  company_name: string | null;
  job_title: string | null;
  period_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeMetrics {
  total_commissions: number;
  pending_commissions: number;
  paid_commissions: number;
  placement_count: number;
  commission_count: number;
}

export function useEmployeeProfile() {
  return useQuery({
    queryKey: ['employee-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('employee_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as EmployeeProfile | null;
    },
  });
}

export function useEmployeeTargets(employeeId?: string) {
  return useQuery({
    queryKey: ['employee-targets', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];

      const { data, error } = await supabase
        .from('employee_targets')
        .select('*')
        .eq('employee_id', employeeId)
        .order('period_start', { ascending: false });

      if (error) throw error;
      return data as EmployeeTarget[];
    },
    enabled: !!employeeId,
  });
}

export function useEmployeeCommissions(employeeId?: string, status?: string) {
  return useQuery({
    queryKey: ['employee-commissions', employeeId, status],
    queryFn: async () => {
      if (!employeeId) return [];

      let query = supabase
        .from('employee_commissions')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EmployeeCommission[];
    },
    enabled: !!employeeId,
  });
}

export function useEmployeeMetrics(employeeId?: string) {
  return useQuery({
    queryKey: ['employee-metrics', employeeId],
    queryFn: async () => {
      if (!employeeId) return null;

      const { data, error } = await supabase.rpc('get_employee_metrics', {
        p_employee_id: employeeId,
      });

      if (error) throw error;
      return (data as unknown) as EmployeeMetrics;
    },
    enabled: !!employeeId,
  });
}

export function useDirectReports(managerId?: string) {
  return useQuery({
    queryKey: ['direct-reports', managerId],
    queryFn: async () => {
      if (!managerId) return [];

      // First get employee profiles
      const { data: employees, error } = await supabase
        .from('employee_profiles')
        .select('*')
        .eq('manager_id', managerId)
        .eq('is_active', true);

      if (error) throw error;
      if (!employees || employees.length === 0) return [];

      // Then fetch profiles for those users
      const userIds = employees.map(e => e.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Merge profiles into employees
      return employees.map(emp => ({
        ...emp,
        profile: profileMap.get(emp.user_id) || null
      })) as EmployeeProfile[];
    },
    enabled: !!managerId,
  });
}

export function useApproveCommission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commissionId, approved }: { commissionId: string; approved: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('employee_commissions')
        .update({
          status: approved ? 'approved' : 'disputed',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', commissionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-commissions'] });
      queryClient.invalidateQueries({ queryKey: ['employee-metrics'] });
    },
  });
}

export function useAllEmployees() {
  return useQuery({
    queryKey: ['all-employees'],
    queryFn: async () => {
      // First get all active employees
      const { data: employees, error } = await supabase
        .from('employee_profiles')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!employees || employees.length === 0) return [];

      // Then fetch profiles for those users
      const userIds = employees.map(e => e.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Merge profiles into employees
      return employees.map(emp => ({
        ...emp,
        profile: profileMap.get(emp.user_id) || null
      })) as EmployeeProfile[];
    },
  });
}

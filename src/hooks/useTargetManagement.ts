import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EmployeeTarget } from "./useEmployeeProfile";
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, format } from "date-fns";

export interface TargetTemplate {
  id: string;
  name: string;
  description: string | null;
  period_type: 'monthly' | 'quarterly' | 'annual';
  revenue_target: number | null;
  placements_target: number | null;
  hours_target: number | null;
  interviews_target: number | null;
  candidates_sourced_target: number | null;
  is_default: boolean;
  created_at: string;
}

export interface CreateTargetInput {
  employee_id: string;
  period_type: 'monthly' | 'quarterly' | 'annual';
  period_start: string;
  period_end: string;
  revenue_target?: number | null;
  placements_target?: number | null;
  hours_target?: number | null;
  interviews_target?: number | null;
  candidates_sourced_target?: number | null;
  notes?: string | null;
}

export interface BulkTargetInput {
  employee_ids: string[];
  period_type: 'monthly' | 'quarterly' | 'annual';
  revenue_target?: number | null;
  placements_target?: number | null;
  hours_target?: number | null;
  interviews_target?: number | null;
  candidates_sourced_target?: number | null;
  notes?: string | null;
}

// Get period dates based on type
export function getPeriodDates(periodType: 'monthly' | 'quarterly' | 'annual', referenceDate = new Date()) {
  switch (periodType) {
    case 'monthly':
      return {
        start: format(startOfMonth(referenceDate), 'yyyy-MM-dd'),
        end: format(endOfMonth(referenceDate), 'yyyy-MM-dd'),
      };
    case 'quarterly':
      return {
        start: format(startOfQuarter(referenceDate), 'yyyy-MM-dd'),
        end: format(endOfQuarter(referenceDate), 'yyyy-MM-dd'),
      };
    case 'annual':
      return {
        start: format(startOfYear(referenceDate), 'yyyy-MM-dd'),
        end: format(endOfYear(referenceDate), 'yyyy-MM-dd'),
      };
  }
}

export function useAllTargets(periodType?: string) {
  return useQuery({
    queryKey: ['all-targets', periodType],
    queryFn: async () => {
      let query = supabase
        .from('employee_targets')
        .select('*')
        .order('period_start', { ascending: false });

      if (periodType) {
        query = query.eq('period_type', periodType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EmployeeTarget[];
    },
  });
}

export function useCreateTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTargetInput) => {
      const { data, error } = await supabase
        .from('employee_targets')
        .insert({
          employee_id: input.employee_id,
          period_type: input.period_type,
          period_start: input.period_start,
          period_end: input.period_end,
          revenue_target: input.revenue_target,
          placements_target: input.placements_target,
          hours_target: input.hours_target,
          interviews_target: input.interviews_target,
          candidates_sourced_target: input.candidates_sourced_target,
          notes: input.notes,
          revenue_achieved: 0,
          placements_achieved: 0,
          hours_achieved: 0,
          interviews_achieved: 0,
          candidates_sourced_achieved: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-targets'] });
      queryClient.invalidateQueries({ queryKey: ['all-targets'] });
      toast.success('Target created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create target: ${error.message}`);
    },
  });
}

export function useBulkCreateTargets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: BulkTargetInput) => {
      const { start, end } = getPeriodDates(input.period_type);

      const targetsToCreate = input.employee_ids.map(employeeId => ({
        employee_id: employeeId,
        period_type: input.period_type,
        period_start: start,
        period_end: end,
        revenue_target: input.revenue_target,
        placements_target: input.placements_target,
        hours_target: input.hours_target,
        interviews_target: input.interviews_target,
        candidates_sourced_target: input.candidates_sourced_target,
        notes: input.notes,
        revenue_achieved: 0,
        placements_achieved: 0,
        hours_achieved: 0,
        interviews_achieved: 0,
        candidates_sourced_achieved: 0,
      }));

      const { data, error } = await supabase
        .from('employee_targets')
        .insert(targetsToCreate)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employee-targets'] });
      queryClient.invalidateQueries({ queryKey: ['all-targets'] });
      toast.success(`Created targets for ${data.length} employees`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create targets: ${error.message}`);
    },
  });
}

export function useUpdateTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EmployeeTarget> & { id: string }) => {
      const { data, error } = await supabase
        .from('employee_targets')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-targets'] });
      queryClient.invalidateQueries({ queryKey: ['all-targets'] });
      toast.success('Target updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update target: ${error.message}`);
    },
  });
}

export function useDeleteTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetId: string) => {
      const { error } = await supabase
        .from('employee_targets')
        .delete()
        .eq('id', targetId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-targets'] });
      queryClient.invalidateQueries({ queryKey: ['all-targets'] });
      toast.success('Target deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete target: ${error.message}`);
    },
  });
}

// Recalculate achievement values based on real data
export function useRecalculateTargetProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetId: string) => {
      // Get the target
      const { data: target, error: targetError } = await supabase
        .from('employee_targets')
        .select('*, employee_profiles!inner(user_id)')
        .eq('id', targetId)
        .single();

      if (targetError) throw targetError;

      const userId = (target as any).employee_profiles.user_id;
      const periodStart = target.period_start;
      const periodEnd = target.period_end;

      // Calculate candidates sourced
      const { count: candidatesSourced } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('sourced_by', userId)
        .gte('created_at', periodStart)
        .lte('created_at', periodEnd);

      // Calculate placements
      const { count: placements } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('sourced_by', userId)
        .eq('status', 'hired')
        .gte('updated_at', periodStart)
        .lte('updated_at', periodEnd);

      // Calculate interviews
      const { data: apps } = await supabase
        .from('applications')
        .select('stages')
        .eq('sourced_by', userId)
        .gte('created_at', periodStart)
        .lte('created_at', periodEnd);

      let interviews = 0;
      apps?.forEach(app => {
        const stages = app.stages as any[];
        if (stages?.some(s => s.name?.toLowerCase().includes('interview'))) {
          interviews++;
        }
      });

      // Calculate hours worked
      const { data: timeEntries } = await supabase
        .from('time_entries')
        .select('duration_seconds')
        .eq('user_id', userId)
        .gte('start_time', periodStart)
        .lte('start_time', periodEnd);

      const hoursWorked = (timeEntries || []).reduce((sum, t) => sum + (t.duration_seconds || 0), 0) / 3600;

      // Calculate revenue from commissions
      const { data: commissions } = await supabase
        .from('employee_commissions')
        .select('gross_amount')
        .eq('employee_id', target.employee_id)
        .gte('period_date', periodStart)
        .lte('period_date', periodEnd);

      const revenue = (commissions || []).reduce((sum, c) => sum + c.gross_amount, 0);

      // Update target with achieved values
      const { data, error } = await supabase
        .from('employee_targets')
        .update({
          candidates_sourced_achieved: candidatesSourced || 0,
          placements_achieved: placements || 0,
          interviews_achieved: interviews,
          hours_achieved: Math.round(hoursWorked),
          revenue_achieved: revenue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-targets'] });
      queryClient.invalidateQueries({ queryKey: ['all-targets'] });
      toast.success('Target progress recalculated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to recalculate: ${error.message}`);
    },
  });
}

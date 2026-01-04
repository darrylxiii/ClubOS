import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProbationAlert {
  id: string;
  application_id: string;
  candidate_id: string;
  job_id: string;
  company_id: string | null;
  alert_type: '30_days' | '14_days' | '7_days' | 'ending_today' | 'expired' | 'check_in';
  alert_date: string;
  is_acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  notes: string | null;
  created_at: string;
  // Joined data
  candidate_name?: string;
  job_title?: string;
  company_name?: string;
  probation_end_date?: string;
}

export function useProbationAlerts(filters?: { companyId?: string; acknowledged?: boolean }) {
  return useQuery({
    queryKey: ['probation-alerts', filters],
    queryFn: async (): Promise<ProbationAlert[]> => {
      let query = supabase
        .from('probation_alerts')
        .select(`
          *,
          applications!inner(
            probation_end_date,
            candidate_profiles(full_name),
            jobs(title, companies(name))
          )
        `)
        .order('alert_date', { ascending: true });

      if (filters?.companyId) {
        query = query.eq('company_id', filters.companyId);
      }

      if (filters?.acknowledged !== undefined) {
        query = query.eq('is_acknowledged', filters.acknowledged);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((alert: any) => ({
        ...alert,
        candidate_name: alert.applications?.candidate_profiles?.full_name,
        job_title: alert.applications?.jobs?.title,
        company_name: alert.applications?.jobs?.companies?.name,
        probation_end_date: alert.applications?.probation_end_date,
      }));
    },
    staleTime: 30000,
  });
}

export function useAcknowledgeProbationAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ alertId, notes }: { alertId: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('probation_alerts')
        .update({
          is_acknowledged: true,
          acknowledged_by: user.id,
          acknowledged_at: new Date().toISOString(),
          notes: notes || null,
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['probation-alerts'] });
      toast.success('Alert acknowledged');
    },
    onError: (error) => {
      console.error('Error acknowledging alert:', error);
      toast.error('Failed to acknowledge alert');
    },
  });
}

export function useUpdateProbationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      applicationId, 
      status 
    }: { 
      applicationId: string; 
      status: 'passed' | 'failed' | 'extended';
    }) => {
      const { error } = await supabase
        .from('applications')
        .update({ probation_status: status })
        .eq('id', applicationId);

      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['probation-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast.success(`Probation marked as ${status}`);
    },
    onError: (error) => {
      console.error('Error updating probation status:', error);
      toast.error('Failed to update probation status');
    },
  });
}

export function useProbationStats() {
  return useQuery({
    queryKey: ['probation-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('probation_status, probation_end_date')
        .eq('status', 'hired')
        .not('probation_end_date', 'is', null);

      if (error) throw error;

      const now = new Date();
      const stats = {
        active: 0,
        endingSoon: 0,
        passed: 0,
        failed: 0,
        extended: 0,
      };

      (data || []).forEach((app: any) => {
        const endDate = new Date(app.probation_end_date);
        const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (app.probation_status === 'passed') stats.passed++;
        else if (app.probation_status === 'failed') stats.failed++;
        else if (app.probation_status === 'extended') stats.extended++;
        else if (daysRemaining <= 14 && daysRemaining > 0) stats.endingSoon++;
        else if (app.probation_status === 'active') stats.active++;
      });

      return stats;
    },
    staleTime: 60000,
  });
}

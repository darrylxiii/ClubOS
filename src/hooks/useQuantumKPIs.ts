import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface KPIMetric {
  id: string;
  category: string;
  kpi_name: string;
  value: number;
  previous_value?: number;
  trend_direction?: 'up' | 'down' | 'stable';
  trend_percent?: number;
  period_type: string;
  period_start: string;
  period_end: string;
  metadata?: Record<string, any>;
}

export interface CategoryKPIs {
  workforce: KPIMetric[];
  pipeline: KPIMetric[];
  recruitment: KPIMetric[];
  experience: KPIMetric[];
  utilisation: KPIMetric[];
  financial: KPIMetric[];
}

// Fetch all KPI metrics
export function useKPIMetrics(period: 'weekly' | 'monthly' = 'weekly') {
  return useQuery({
    queryKey: ['kpi-metrics', period],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('kpi_metrics')
        .select('*')
        .eq('period_type', period)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by category
      const grouped: CategoryKPIs = {
        workforce: [],
        pipeline: [],
        recruitment: [],
        experience: [],
        utilisation: [],
        financial: [],
      };

      (data || []).forEach((metric: KPIMetric) => {
        const category = metric.category as keyof CategoryKPIs;
        if (grouped[category]) {
          grouped[category].push(metric);
        }
      });

      return grouped;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch specific KPI by name
export function useKPI(kpiName: string, period: 'weekly' | 'monthly' = 'weekly') {
  return useQuery({
    queryKey: ['kpi', kpiName, period],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('kpi_metrics')
        .select('*')
        .eq('kpi_name', kpiName)
        .eq('period_type', period)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as KPIMetric | null;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Refresh KPI calculations
export function useRefreshKPIs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (period: 'weekly' | 'monthly' = 'weekly') => {
      const { data, error } = await supabase.functions.invoke('calculate-kpi-metrics', {
        body: { period }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['kpi'] });
    },
  });
}

// Time entries hooks
export function useTimeEntries(userId?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['time-entries', userId, startDate, endDate],
    queryFn: async () => {
      let query = (supabase as any)
        .from('time_entries')
        .select('*')
        .order('date', { ascending: false });

      if (userId) query = query.eq('user_id', userId);
      if (startDate) query = query.gte('date', startDate);
      if (endDate) query = query.lte('date', endDate);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: true,
  });
}

export function useCreateTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: {
      date: string;
      hours_worked: number;
      billable_hours?: number;
      idle_time_minutes?: number;
      activity_level?: string;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await (supabase as any)
        .from('time_entries')
        .insert({ ...entry, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
    },
  });
}

// NPS Survey hooks
export function useNPSSurveys(type?: 'candidate' | 'client') {
  return useQuery({
    queryKey: ['nps-surveys', type],
    queryFn: async () => {
      let query = (supabase as any)
        .from('nps_surveys')
        .select('*')
        .order('response_date', { ascending: false });

      if (type) query = query.eq('survey_type', type);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useSubmitNPS() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (survey: {
      survey_type: 'candidate' | 'client';
      respondent_id: string;
      respondent_type: 'candidate' | 'partner';
      nps_score: number;
      job_id?: string;
      application_id?: string;
      stage_name?: string;
      feedback_text?: string;
    }) => {
      const { data, error } = await (supabase as any)
        .from('nps_surveys')
        .insert(survey)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nps-surveys'] });
      queryClient.invalidateQueries({ queryKey: ['kpi-metrics'] });
    },
  });
}

// CSAT Survey hooks
export function useCSATSurveys(milestone?: string) {
  return useQuery({
    queryKey: ['csat-surveys', milestone],
    queryFn: async () => {
      let query = (supabase as any)
        .from('csat_surveys')
        .select('*')
        .order('created_at', { ascending: false });

      if (milestone) query = query.eq('milestone', milestone);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useSubmitCSAT() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (survey: {
      respondent_id: string;
      respondent_type: 'candidate' | 'partner';
      milestone: string;
      score: number;
      application_id?: string;
      job_id?: string;
      feedback?: string;
    }) => {
      const { data, error } = await (supabase as any)
        .from('csat_surveys')
        .insert(survey)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csat-surveys'] });
      queryClient.invalidateQueries({ queryKey: ['kpi-metrics'] });
    },
  });
}

// Capacity planning hooks
export function useCapacityPlanning(userId?: string) {
  return useQuery({
    queryKey: ['capacity-planning', userId],
    queryFn: async () => {
      let query = (supabase as any)
        .from('capacity_planning')
        .select('*')
        .order('week_start', { ascending: false });

      if (userId) query = query.eq('user_id', userId);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

// Bonus tracking hooks
export function useRecruiterBonuses(recruiterId?: string) {
  return useQuery({
    queryKey: ['recruiter-bonuses', recruiterId],
    queryFn: async () => {
      let query = (supabase as any)
        .from('recruiter_bonuses')
        .select('*')
        .order('period_start', { ascending: false });

      if (recruiterId) query = query.eq('recruiter_id', recruiterId);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

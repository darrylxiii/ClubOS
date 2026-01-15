import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SalesKPI {
  id: string;
  category: string;
  kpi_name: string;
  value: number;
  previous_value?: number;
  target_value?: number;
  threshold_warning?: number;
  threshold_critical?: number;
  trend_direction?: 'up' | 'down' | 'stable';
  trend_percentage?: number;
  period_type: string;
  period_start: string;
  period_end: string;
  rep_id?: string;
  company_id?: string;
  breakdown?: Record<string, any>;
  metadata?: Record<string, any>;
  calculated_at: string;
}

export interface SalesConversation {
  id: string;
  contact_id?: string;
  company_id?: string;
  channel: string;
  direction?: string;
  first_message_at: string;
  last_message_at?: string;
  message_count: number;
  is_qualified: boolean;
  qualification_stage?: string;
  resulted_in_booking: boolean;
  referral_mentioned: boolean;
  owner_id?: string;
  status: string;
}

export interface SalesProposal {
  id: string;
  job_id?: string;
  company_id?: string;
  title: string;
  proposal_value: number;
  final_value?: number;
  status: string;
  proposal_sent_at?: string;
  accepted_at?: string;
  revision_count: number;
}

export interface SalesForecast {
  id: string;
  job_id?: string;
  company_id?: string;
  forecast_period: string;
  predicted_value?: number;
  weighted_value?: number;
  confidence_score?: number;
  is_slipping: boolean;
  slip_days?: number;
}

// Fetch Sales KPIs by category
export function useSalesKPIsByCategory(category: string, periodType: string = 'daily') {
  return useQuery({
    queryKey: ['sales-kpis', category, periodType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_kpi_metrics')
        .select('*')
        .eq('category', category)
        .eq('period_type', periodType)
        .order('calculated_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as SalesKPI[];
    },
  });
}

// Fetch all Sales KPIs with real-time updates
export function useAllSalesKPIs(periodType: string = 'daily') {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['sales-kpis', 'all', periodType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_kpi_metrics')
        .select('*')
        .eq('period_type', periodType)
        .order('calculated_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return data as SalesKPI[];
    },
  });

  // Real-time subscription for live updates
  useEffect(() => {
    const channel = supabase
      .channel('sales-kpi-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales_kpi_metrics' },
        () => {
          // Invalidate and refetch when data changes
          queryClient.invalidateQueries({ queryKey: ['sales-kpis'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

// Calculate Sales KPIs via edge function
export function useCalculateSalesKPIs() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: { period_type?: string; rep_id?: string; company_id?: string }) => {
      const { data, error } = await supabase.functions.invoke('calculate-sales-kpis', {
        body: params,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-kpis'] });
    },
  });
}

// Fetch Sales Conversations
export function useSalesConversations(filters?: { status?: string; channel?: string; is_qualified?: boolean }) {
  return useQuery({
    queryKey: ['sales-conversations', filters],
    queryFn: async () => {
      let query = supabase
        .from('sales_conversations')
        .select('*')
        .order('last_message_at', { ascending: false })
        .limit(100);
      
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.channel) query = query.eq('channel', filters.channel);
      if (filters?.is_qualified !== undefined) query = query.eq('is_qualified', filters.is_qualified);
      
      const { data, error } = await query;
      if (error) throw error;
      return data as SalesConversation[];
    },
  });
}

// Fetch Sales Proposals
export function useSalesProposals(filters?: { status?: string }) {
  return useQuery({
    queryKey: ['sales-proposals', filters],
    queryFn: async () => {
      let query = supabase
        .from('sales_proposals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (filters?.status) query = query.eq('status', filters.status);
      
      const { data, error } = await query;
      if (error) throw error;
      return data as SalesProposal[];
    },
  });
}

// Fetch Sales Forecasts
export function useSalesForecasts(onlySlipping: boolean = false) {
  return useQuery({
    queryKey: ['sales-forecasts', onlySlipping],
    queryFn: async () => {
      let query = supabase
        .from('sales_forecasts')
        .select('*')
        .order('forecast_period', { ascending: false })
        .limit(50);
      
      if (onlySlipping) query = query.eq('is_slipping', true);
      
      const { data, error } = await query;
      if (error) throw error;
      return data as SalesForecast[];
    },
  });
}

// Fetch AI Outreach Stats
export function useAIOutreachStats(periodDays: number = 30) {
  return useQuery({
    queryKey: ['ai-outreach-stats', periodDays],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - periodDays);
      
      const { data, error } = await supabase
        .from('ai_outreach_logs')
        .select('*')
        .gte('sent_at', startDate.toISOString());
      
      if (error) throw error;
      
      const total = data?.length || 0;
      const replied = data?.filter(d => d.replied_at).length || 0;
      const unedited = data?.filter(d => !d.was_edited).length || 0;
      const booked = data?.filter(d => d.resulted_in_booking).length || 0;
      
      return {
        total,
        replied,
        unedited,
        booked,
        replyRate: total ? (replied / total * 100) : 0,
        draftSuccessRate: total ? (unedited / total * 100) : 0,
        bookingRate: total ? (booked / total * 100) : 0,
      };
    },
  });
}

// Get KPIs grouped by category
export function useGroupedSalesKPIs(periodType: string = 'daily') {
  const { data: allKpis, ...rest } = useAllSalesKPIs(periodType);
  
  const grouped = allKpis?.reduce((acc, kpi) => {
    if (!acc[kpi.category]) {
      acc[kpi.category] = [];
    }
    // Only keep the latest value for each KPI name
    const existingIndex = acc[kpi.category].findIndex(k => k.kpi_name === kpi.kpi_name);
    if (existingIndex === -1) {
      acc[kpi.category].push(kpi);
    }
    return acc;
  }, {} as Record<string, SalesKPI[]>);
  
  return { data: grouped, ...rest };
}

// Rep Performance
export function useRepPerformance(repId: string) {
  return useQuery({
    queryKey: ['rep-performance', repId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_kpi_metrics')
        .select('*')
        .eq('rep_id', repId)
        .order('calculated_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as SalesKPI[];
    },
    enabled: !!repId,
  });
}

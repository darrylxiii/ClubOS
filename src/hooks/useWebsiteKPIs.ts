import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WebKPIMetric {
  id: string;
  category: string;
  kpi_name: string;
  value: number | null;
  target_value: number | null;
  threshold_warning: number | null;
  threshold_critical: number | null;
  period_type: string;
  period_date: string;
  trend_direction: string | null;
  trend_percentage: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AdCampaign {
  id: string;
  campaign_id: string;
  campaign_name: string | null;
  ad_platform: string;
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  brand_impressions: number;
  non_brand_impressions: number;
  ctr: number | null;
  cpc: number | null;
  gclid_capture_count: number;
  total_sessions: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ContentAIScore {
  id: string;
  page_path: string;
  page_title: string | null;
  content_clarity_score: number | null;
  emotional_sentiment: string | null;
  sentiment_score: number | null;
  heat_trigger_ratio: number | null;
  readability_grade: number | null;
  word_count: number | null;
  analyzed_at: string;
  analysis_model: string;
  analysis_details: Record<string, unknown>;
  improvement_suggestions: string[] | null;
  created_at: string;
}

export interface WebPerformanceMetric {
  id: string;
  date: string;
  page_path: string | null;
  lcp_ms: number | null;
  fid_ms: number | null;
  cls_score: number | null;
  inp_ms: number | null;
  ttfb_ms: number | null;
  fcp_ms: number | null;
  cwv_pass: boolean | null;
  sample_count: number;
  p75_lcp: number | null;
  p75_fid: number | null;
  p75_cls: number | null;
  lighthouse_score: number | null;
  created_at: string;
}

type WebKPICategory = 'north_star' | 'funnel' | 'attribution' | 'ai_insights' | 'retention' | 'google_signals';

export function useWebKPIMetrics(category?: WebKPICategory) {
  return useQuery({
    queryKey: ['web-kpi-metrics', category],
    queryFn: async () => {
      let query = supabase
        .from('web_kpi_metrics')
        .select('*')
        .order('period_date', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as WebKPIMetric[];
    },
  });
}

export function useLatestWebKPIs() {
  return useQuery({
    queryKey: ['web-kpis-latest'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('web_kpi_metrics')
        .select('*')
        .eq('period_date', today)
        .order('category');

      if (error) throw error;
      return data as WebKPIMetric[];
    },
  });
}

export function useAdCampaigns(dateRange?: { start: string; end: string }) {
  return useQuery({
    queryKey: ['ad-campaigns', dateRange],
    queryFn: async () => {
      let query = supabase
        .from('ad_campaigns')
        .select('*')
        .order('date', { ascending: false });

      if (dateRange) {
        query = query.gte('date', dateRange.start).lte('date', dateRange.end);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as AdCampaign[];
    },
  });
}

export function useContentAIScores() {
  return useQuery({
    queryKey: ['content-ai-scores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_ai_scores')
        .select('*')
        .order('analyzed_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as ContentAIScore[];
    },
  });
}

export function useWebPerformanceMetrics(days: number = 7) {
  return useQuery({
    queryKey: ['web-performance-metrics', days],
    queryFn: async () => {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('web_performance_metrics')
        .select('*')
        .gte('date', startDate)
        .order('date', { ascending: false });

      if (error) throw error;
      return data as WebPerformanceMetric[];
    },
  });
}

export function useCalculateWebKPIs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('calculate-web-kpis');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['web-kpi-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['web-kpis-latest'] });
    },
  });
}

// Helper to get KPI status based on thresholds
export function getKPIStatus(kpi: WebKPIMetric): 'success' | 'warning' | 'critical' | 'neutral' {
  if (!kpi.value) return 'neutral';
  
  // For metrics where lower is better (CPL, bounce rate, etc.)
  const lowerIsBetter = ['cpl', 'cpsql', 'bounce_rate', 'page_load_time_lcp', 'search_to_lead_lag', 'session_to_sql_lag'];
  
  if (lowerIsBetter.includes(kpi.kpi_name)) {
    if (kpi.threshold_critical && kpi.value >= kpi.threshold_critical) return 'critical';
    if (kpi.threshold_warning && kpi.value >= kpi.threshold_warning) return 'warning';
    if (kpi.target_value && kpi.value <= kpi.target_value) return 'success';
  } else {
    // Higher is better
    if (kpi.threshold_critical && kpi.value <= kpi.threshold_critical) return 'critical';
    if (kpi.threshold_warning && kpi.value <= kpi.threshold_warning) return 'warning';
    if (kpi.target_value && kpi.value >= kpi.target_value) return 'success';
  }
  
  return 'neutral';
}

// Format KPI display name
export function formatKPIName(kpiName: string): string {
  const nameMap: Record<string, string> = {
    cpl: 'CPL (Cost per Lead)',
    cpsql: 'CPSQL (Cost per SQL)',
    landing_page_conversion_rate: 'Landing Page CR',
    search_to_lead_lag: 'Search-to-Lead Lag',
    sessions_organic: 'Organic Sessions',
    sessions_paid: 'Paid Sessions',
    sessions_referral: 'Referral Sessions',
    impressions_brand: 'Brand Impressions',
    impressions_non_brand: 'Non-Brand Impressions',
    ctr: 'Click-Through Rate',
    bounce_rate: 'Bounce Rate',
    page_load_time_lcp: 'Page Load (LCP)',
    lead_attribution_organic_pct: 'Organic Attribution %',
    lead_attribution_paid_pct: 'Paid Attribution %',
    lead_attribution_referral_pct: 'Referral Attribution %',
    session_to_sql_lag: 'Session→SQL Lag',
    content_clarity_avg: 'Content Clarity',
    emotional_load_score: 'Emotional Load',
    heat_trigger_ratio: 'Heat Trigger Ratio',
    returning_visitor_pct: 'Returning Visitors %',
    retarget_conversion_rate: 'Retarget CR',
    branded_ctr: 'Branded CTR',
    non_branded_ctr: 'Non-Branded CTR',
    gclid_capture_success: 'GCLID Capture %',
    cwv_pass_rate: 'CWV Pass Rate',
    sqls_from_search: 'SQLs from Search',
  };
  
  return nameMap[kpiName] || kpiName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
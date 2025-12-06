import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useKPIMetrics, type KPIMetric } from './useQuantumKPIs';
import { useLatestWebKPIs, getKPIStatus, type WebKPIMetric } from './useWebsiteKPIs';
import { useGroupedSalesKPIs, type SalesKPI } from './useSalesKPIs';

export type KPIDomain = 'operations' | 'website' | 'sales';
export type KPIStatus = 'success' | 'warning' | 'critical' | 'neutral';

export interface UnifiedKPI {
  id: string;
  domain: KPIDomain;
  category: string;
  name: string;
  displayName: string;
  value: number;
  previousValue?: number;
  targetValue?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
  trendDirection?: 'up' | 'down' | 'stable';
  trendPercentage?: number;
  status: KPIStatus;
  format: 'number' | 'percent' | 'currency' | 'hours' | 'days' | 'minutes';
  unit?: string;
  description?: string;
  lowerIsBetter?: boolean;
  breakdown?: Record<string, any>;
}

export interface DomainHealth {
  domain: KPIDomain;
  label: string;
  healthScore: number;
  totalKPIs: number;
  onTarget: number;
  warnings: number;
  critical: number;
  categories: CategoryHealth[];
}

export interface CategoryHealth {
  name: string;
  displayName: string;
  healthScore: number;
  kpiCount: number;
  onTarget: number;
  warnings: number;
  critical: number;
}

export interface CriticalAlert {
  kpi: UnifiedKPI;
  severity: 'warning' | 'critical';
  message: string;
}

// Format display names for KPIs
const kpiDisplayNames: Record<string, string> = {
  // Operations
  hours_worked: 'Hours Worked',
  tasks_completed: 'Tasks Completed',
  task_completion_pct: 'Task Completion %',
  tasks_per_hour: 'Tasks per Hour',
  productivity_index: 'Productivity Index',
  pipelines_open: 'Pipelines Open',
  pipelines_closed: 'Pipelines Closed',
  pipelines_lost: 'Pipelines Lost',
  pipeline_win_rate: 'Win Rate',
  avg_deal_size: 'Avg Deal Size',
  cto_score: 'CTO Score',
  avg_time_to_hire: 'Time to Hire',
  candidate_meetings: 'Candidate Meetings',
  client_meetings: 'Client Meetings',
  meeting_to_offer_ratio: 'Meeting-to-Offer',
  hours_per_placement: 'Hours/Placement',
  nps_candidate: 'NPS Candidate',
  nps_client: 'NPS Client',
  avg_csat: 'Avg CSAT',
  referral_rate: 'Referral Rate',
  capacity_load: 'Capacity Load',
  idle_time_pct: 'Idle Time %',
  revenue_per_billable_hour: 'Rev/Billable Hour',
  bonus_earned: 'Bonus Earned',
  bonus_pct_of_revenue: 'Bonus % Revenue',
  cost_per_placement: 'Cost/Placement',
  
  // Website
  cpl: 'Cost per Lead',
  cpsql: 'Cost per SQL',
  landing_page_conversion_rate: 'Landing Page CR',
  search_to_lead_lag: 'Search→Lead Lag',
  sessions_organic: 'Organic Sessions',
  sessions_paid: 'Paid Sessions',
  sessions_referral: 'Referral Sessions',
  ctr: 'Click-Through Rate',
  bounce_rate: 'Bounce Rate',
  page_load_time_lcp: 'Page Load (LCP)',
  impressions_brand: 'Brand Impressions',
  impressions_non_brand: 'Non-Brand Impressions',
  lead_attribution_organic_pct: 'Organic Attribution',
  lead_attribution_paid_pct: 'Paid Attribution',
  lead_attribution_referral_pct: 'Referral Attribution',
  session_to_sql_lag: 'Session→SQL Lag',
  content_clarity_avg: 'Content Clarity',
  emotional_load_score: 'Emotional Load',
  heat_trigger_ratio: 'Heat Trigger Ratio',
  returning_visitor_pct: 'Returning Visitors',
  retarget_conversion_rate: 'Retarget CR',
  branded_ctr: 'Branded CTR',
  non_branded_ctr: 'Non-Branded CTR',
  gclid_capture_success: 'GCLID Capture',
  cwv_pass_rate: 'CWV Pass Rate',
  sqls_from_search: 'SQLs from Search',
  
  // Sales
  initial_conversations: 'Initial Conversations',
  qualified_conversations: 'Qualified Conversations',
  qualification_rate: 'Qualification Rate',
  call_scheduled_per_100: 'Calls/100 Convos',
  discovery_calls_held: 'Discovery Calls',
  show_rate: 'Show Rate',
  no_shows: 'No Shows',
  avg_call_duration: 'Avg Call Duration',
  next_step_rate: 'Next Step Rate',
  proposals_sent: 'Proposals Sent',
  proposal_close_ratio: 'Close Ratio',
  avg_proposal_value: 'Avg Proposal Value',
  total_pipeline_value: 'Pipeline Value',
  scope_change_frequency: 'Scope Changes',
  deals_closed_won: 'Deals Won',
  win_rate: 'Win Rate',
  churned_deals: 'Churned Deals',
  total_revenue: 'Total Revenue',
  ai_messages_sent: 'AI Messages Sent',
  ai_reply_rate: 'AI Reply Rate',
  ai_draft_success_rate: 'Draft Success',
  ai_calls_booked: 'AI Calls Booked',
  lead_sentiment_score: 'Lead Sentiment',
  avg_intent_score: 'Intent Score',
  conversation_velocity: 'Convo Velocity',
  post_call_satisfaction: 'Post-Call CSAT',
  weighted_pipeline_value: 'Weighted Pipeline',
  slipping_deals: 'Slipping Deals',
  pipeline_coverage_ratio: 'Pipeline Coverage',
  avg_forecast_confidence: 'Forecast Confidence',
};

// Category display names
const categoryDisplayNames: Record<string, string> = {
  workforce: 'Workforce',
  pipeline: 'Pipeline',
  recruitment: 'Recruitment',
  experience: 'Experience',
  utilisation: 'Utilisation',
  financial: 'Financial',
  north_star: 'North Star',
  funnel: 'Performance',
  attribution: 'Attribution',
  ai_insights: 'AI Insights',
  retention: 'Retention',
  google_signals: 'Google Signals',
  conversational: 'Conversational',
  meetings: 'Meetings',
  proposals: 'Proposals',
  closing: 'Closing',
  ai_efficiency: 'AI Efficiency',
  quality: 'Quality',
  forecasting: 'Forecasting',
};

// Determine format for KPI
function getKPIFormat(name: string): { format: UnifiedKPI['format']; unit?: string; lowerIsBetter?: boolean } {
  if (name.includes('pct') || name.includes('rate') || name.includes('ratio') || name === 'win_rate') {
    return { format: 'percent', unit: '%' };
  }
  if (name.includes('value') || name.includes('revenue') || name.includes('deal_size') || 
      name.includes('bonus') || name.includes('cost') || name === 'cpl' || name === 'cpsql') {
    return { format: 'currency', unit: '€' };
  }
  if (name.includes('hours') || name === 'hours_worked') {
    return { format: 'hours', unit: 'h' };
  }
  if (name.includes('days') || name === 'avg_time_to_hire') {
    return { format: 'days', unit: 'd' };
  }
  if (name.includes('duration') || name.includes('lag')) {
    return { format: 'minutes', unit: 'min' };
  }
  
  // Lower is better for these
  const lowerIsBetter = ['bounce_rate', 'idle_time_pct', 'slipping_deals', 'churned_deals', 
    'no_shows', 'scope_change_frequency', 'cpl', 'cpsql', 'page_load_time_lcp', 
    'search_to_lead_lag', 'session_to_sql_lag', 'cost_per_placement'].includes(name);
  
  return { format: 'number', lowerIsBetter };
}

// Calculate status for unified KPI
function calculateKPIStatus(kpi: Partial<UnifiedKPI>): KPIStatus {
  const { value, targetValue, warningThreshold, criticalThreshold, lowerIsBetter } = kpi;
  
  if (value === undefined || value === null) return 'neutral';
  
  if (lowerIsBetter) {
    if (criticalThreshold !== undefined && value >= criticalThreshold) return 'critical';
    if (warningThreshold !== undefined && value >= warningThreshold) return 'warning';
    if (targetValue !== undefined && value <= targetValue) return 'success';
  } else {
    if (criticalThreshold !== undefined && value <= criticalThreshold) return 'critical';
    if (warningThreshold !== undefined && value <= warningThreshold) return 'warning';
    if (targetValue !== undefined && value >= targetValue) return 'success';
  }
  
  return 'neutral';
}

// Transform Operations KPIs
function transformOperationsKPIs(metrics: Record<string, KPIMetric[]> | undefined): UnifiedKPI[] {
  if (!metrics) return [];
  
  const result: UnifiedKPI[] = [];
  
  Object.entries(metrics).forEach(([category, kpis]) => {
    kpis.forEach(kpi => {
      const formatInfo = getKPIFormat(kpi.kpi_name);
      const unified: UnifiedKPI = {
        id: kpi.id,
        domain: 'operations',
        category,
        name: kpi.kpi_name,
        displayName: kpiDisplayNames[kpi.kpi_name] || kpi.kpi_name.replace(/_/g, ' '),
        value: kpi.value,
        previousValue: kpi.previous_value,
        trendDirection: kpi.trend_direction,
        trendPercentage: kpi.trend_percent,
        status: 'neutral',
        ...formatInfo,
      };
      unified.status = calculateKPIStatus(unified);
      result.push(unified);
    });
  });
  
  return result;
}

// Transform Website KPIs
function transformWebsiteKPIs(kpis: WebKPIMetric[] | undefined): UnifiedKPI[] {
  if (!kpis) return [];
  
  return kpis.map(kpi => {
    const formatInfo = getKPIFormat(kpi.kpi_name);
    const unified: UnifiedKPI = {
      id: kpi.id,
      domain: 'website',
      category: kpi.category,
      name: kpi.kpi_name,
      displayName: kpiDisplayNames[kpi.kpi_name] || kpi.kpi_name.replace(/_/g, ' '),
      value: kpi.value || 0,
      targetValue: kpi.target_value || undefined,
      warningThreshold: kpi.threshold_warning || undefined,
      criticalThreshold: kpi.threshold_critical || undefined,
      trendDirection: kpi.trend_direction as 'up' | 'down' | 'stable' | undefined,
      trendPercentage: kpi.trend_percentage || undefined,
      status: getKPIStatus(kpi),
      ...formatInfo,
    };
    return unified;
  });
}

// Transform Sales KPIs
function transformSalesKPIs(grouped: Record<string, SalesKPI[]> | undefined): UnifiedKPI[] {
  if (!grouped) return [];
  
  const result: UnifiedKPI[] = [];
  
  Object.entries(grouped).forEach(([category, kpis]) => {
    kpis.forEach(kpi => {
      const formatInfo = getKPIFormat(kpi.kpi_name);
      const unified: UnifiedKPI = {
        id: kpi.id,
        domain: 'sales',
        category,
        name: kpi.kpi_name,
        displayName: kpiDisplayNames[kpi.kpi_name] || kpi.kpi_name.replace(/_/g, ' '),
        value: kpi.value,
        previousValue: kpi.previous_value,
        targetValue: kpi.target_value,
        warningThreshold: kpi.threshold_warning,
        criticalThreshold: kpi.threshold_critical,
        trendDirection: kpi.trend_direction,
        trendPercentage: kpi.trend_percentage,
        status: 'neutral',
        breakdown: kpi.breakdown,
        ...formatInfo,
      };
      unified.status = calculateKPIStatus(unified);
      result.push(unified);
    });
  });
  
  return result;
}

// Calculate domain health
function calculateDomainHealth(kpis: UnifiedKPI[], domain: KPIDomain, label: string): DomainHealth {
  const domainKPIs = kpis.filter(k => k.domain === domain);
  const categories = [...new Set(domainKPIs.map(k => k.category))];
  
  const categoryHealths: CategoryHealth[] = categories.map(cat => {
    const catKPIs = domainKPIs.filter(k => k.category === cat);
    const onTarget = catKPIs.filter(k => k.status === 'success').length;
    const warnings = catKPIs.filter(k => k.status === 'warning').length;
    const critical = catKPIs.filter(k => k.status === 'critical').length;
    
    const score = catKPIs.length > 0 
      ? Math.round(((onTarget * 100) + (warnings * 50) + (critical * 0)) / catKPIs.length)
      : 0;
    
    return {
      name: cat,
      displayName: categoryDisplayNames[cat] || cat,
      healthScore: score,
      kpiCount: catKPIs.length,
      onTarget,
      warnings,
      critical,
    };
  });
  
  const onTarget = domainKPIs.filter(k => k.status === 'success').length;
  const warnings = domainKPIs.filter(k => k.status === 'warning').length;
  const critical = domainKPIs.filter(k => k.status === 'critical').length;
  
  const healthScore = domainKPIs.length > 0
    ? Math.round(((onTarget * 100) + (warnings * 50) + (critical * 0)) / domainKPIs.length)
    : 0;
  
  return {
    domain,
    label,
    healthScore,
    totalKPIs: domainKPIs.length,
    onTarget,
    warnings,
    critical,
    categories: categoryHealths,
  };
}

// Main hook
export function useUnifiedKPIs(period: 'weekly' | 'monthly' = 'weekly') {
  const { data: operationsData, isLoading: opsLoading, refetch: refetchOps } = useKPIMetrics(period);
  const { data: websiteData, isLoading: webLoading, refetch: refetchWeb } = useLatestWebKPIs();
  const { data: salesData, isLoading: salesLoading, refetch: refetchSales } = useGroupedSalesKPIs();
  
  const isLoading = opsLoading || webLoading || salesLoading;
  
  // Transform all KPIs
  const operationsKPIs = transformOperationsKPIs(operationsData as unknown as Record<string, KPIMetric[]> | undefined);
  const websiteKPIs = transformWebsiteKPIs(websiteData);
  const salesKPIs = transformSalesKPIs(salesData);
  
  const allKPIs = [...operationsKPIs, ...websiteKPIs, ...salesKPIs];
  
  // Calculate domain health
  const operationsHealth = calculateDomainHealth(allKPIs, 'operations', 'Operations');
  const websiteHealth = calculateDomainHealth(allKPIs, 'website', 'Website');
  const salesHealth = calculateDomainHealth(allKPIs, 'sales', 'Sales');
  
  // Overall health
  const totalKPIs = allKPIs.length;
  const totalOnTarget = allKPIs.filter(k => k.status === 'success').length;
  const totalWarnings = allKPIs.filter(k => k.status === 'warning').length;
  const totalCritical = allKPIs.filter(k => k.status === 'critical').length;
  
  const overallHealth = totalKPIs > 0
    ? Math.round(((totalOnTarget * 100) + (totalWarnings * 50) + (totalCritical * 0)) / totalKPIs)
    : 0;
  
  // Critical alerts
  const criticalAlerts: CriticalAlert[] = allKPIs
    .filter(k => k.status === 'critical' || k.status === 'warning')
    .map(kpi => ({
      kpi,
      severity: kpi.status as 'warning' | 'critical',
      message: `${kpi.displayName} is ${kpi.status === 'critical' ? 'critically low' : 'below target'}`,
    }))
    .sort((a, b) => (a.severity === 'critical' ? -1 : 1) - (b.severity === 'critical' ? -1 : 1));
  
  // Group by domain
  const byDomain = {
    operations: operationsKPIs,
    website: websiteKPIs,
    sales: salesKPIs,
  };
  
  // Group by category
  const byCategory = allKPIs.reduce((acc, kpi) => {
    const key = `${kpi.domain}:${kpi.category}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(kpi);
    return acc;
  }, {} as Record<string, UnifiedKPI[]>);
  
  // Refresh all
  const refreshAll = async () => {
    await Promise.all([refetchOps(), refetchWeb(), refetchSales()]);
  };
  
  return {
    isLoading,
    allKPIs,
    byDomain,
    byCategory,
    domainHealth: [operationsHealth, websiteHealth, salesHealth],
    overallHealth,
    totalKPIs,
    totalOnTarget,
    totalWarnings,
    totalCritical,
    onTargetPercentage: totalKPIs > 0 ? Math.round((totalOnTarget / totalKPIs) * 100) : 0,
    criticalAlerts,
    refreshAll,
    categoryDisplayNames,
  };
}

// Hook for cross-domain insights
export function useCrossDomainInsights(kpis: UnifiedKPI[]) {
  // Analyze correlations between domains
  const insights: { type: 'warning' | 'success' | 'info'; message: string; action?: string }[] = [];
  
  // Example correlations
  const cpl = kpis.find(k => k.name === 'cpl');
  const landingCR = kpis.find(k => k.name === 'landing_page_conversion_rate');
  
  if (cpl && landingCR && cpl.status === 'warning' && landingCR.status !== 'success') {
    insights.push({
      type: 'warning',
      message: 'High CPL correlating with low Landing Page CR',
      action: 'A/B test landing pages before increasing ad spend',
    });
  }
  
  const showRate = kpis.find(k => k.name === 'show_rate');
  const npsCandidate = kpis.find(k => k.name === 'nps_candidate');
  
  if (showRate && npsCandidate && showRate.status === 'success' && npsCandidate.status === 'success') {
    insights.push({
      type: 'success',
      message: 'High Show Rate correlating with strong NPS Candidate Score',
      action: 'Maintain current call confirmation flow',
    });
  }
  
  const winRate = kpis.find(k => k.name === 'win_rate');
  const timeToHire = kpis.find(k => k.name === 'avg_time_to_hire');
  
  if (winRate && timeToHire && winRate.status === 'success') {
    insights.push({
      type: 'info',
      message: 'Pipeline Win Rate stable with optimized hiring cycle',
      action: 'Process optimization working; maintain current approach',
    });
  }
  
  return insights;
}

export { categoryDisplayNames };

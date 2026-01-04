import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useKPIMetrics, type KPIMetric } from './useQuantumKPIs';
import { useLatestWebKPIs, getKPIStatus, type WebKPIMetric } from './useWebsiteKPIs';
import { useGroupedSalesKPIs, type SalesKPI } from './useSalesKPIs';
import { useSystemHealth } from './useSystemHealth';
import { usePredictiveAnalytics } from './usePredictiveAnalytics';
import { useApplicationMetrics } from './useApplicationMetrics';
import { usePlatformHealth } from './usePlatformHealth';
import { useFinancialStats } from './useFinancialData';
import { useSecurityMetrics } from './useSecurityMetrics';
import { useCompanyMetrics } from './useCompanyMetrics';
import { useMoneybirdFinancialKPIs } from './useMoneybirdFinancialKPIs';

export type KPIDomain = 'operations' | 'website' | 'sales' | 'platform' | 'intelligence' | 'growth' | 'costs';
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
  format: 'number' | 'percent' | 'currency' | 'hours' | 'days' | 'minutes' | 'ms';
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
  
  // Platform Health
  platform_health_score: 'Platform Health',
  active_users_1h: 'Active Users (1h)',
  total_errors_1h: 'Errors (1h)',
  critical_errors_1h: 'Critical Errors (1h)',
  avg_response_time_ms: 'Avg Response Time',
  db_connections: 'DB Connections',
  edge_function_success_rate: 'Edge Fn Success Rate',
  edge_function_avg_duration: 'Edge Fn Avg Duration',
  
  // Security
  rls_coverage_pct: 'RLS Coverage',
  rls_total_policies: 'Total RLS Policies',
  tables_with_rls: 'Tables with RLS',
  auth_failures_24h: 'Auth Failures (24h)',
  auth_unique_ips: 'Unique Failed IPs',
  rate_limit_rejections: 'Rate Limit Rejections',
  public_buckets: 'Public Buckets',
  private_buckets: 'Private Buckets',
  
  // Intelligence
  ml_model_auc_roc: 'Model AUC-ROC',
  ml_predictions_count: 'ML Predictions',
  churn_critical_count: 'Critical Churn Risk',
  churn_high_count: 'High Churn Risk',
  high_engagement_users: 'High Engagement',
  medium_engagement_users: 'Medium Engagement',
  low_engagement_users: 'Low Engagement',
  avg_events_per_user: 'Avg Events/User',
  
  // Growth
  total_applications: 'Total Applications',
  pending_review: 'Pending Review',
  approved_applications: 'Approved',
  rejected_applications: 'Rejected',
  new_today: 'New Today',
  approval_rate: 'Approval Rate',
  jobs_filled_this_month: 'Jobs Filled',
  active_meetings: 'Active Meetings',
  total_placement_revenue: 'Placement Revenue',
  paid_placement_revenue: 'Paid Revenue',
  outstanding_invoices: 'Outstanding Invoices',
  overdue_invoices: 'Overdue Invoices',
  pending_payouts: 'Pending Payouts',
  
  // Companies
  total_companies: 'Total Companies',
  active_companies: 'Active Companies',
  companies_new_this_month: 'New Companies',
  total_company_jobs: 'Company Jobs',
  total_followers: 'Total Followers',
  
  // Referrals
  referral_count: 'Total Referrals',
  hired_referrals: 'Hired from Referrals',
  referral_conversion_rate: 'Referral Conversion',
};

// Category display names
const categoryDisplayNames: Record<string, string> = {
  // Operations
  workforce: 'Workforce',
  pipeline: 'Pipeline',
  recruitment: 'Recruitment',
  experience: 'Experience',
  utilisation: 'Utilisation',
  financial: 'Financial',
  // Website
  north_star: 'North Star',
  funnel: 'Performance',
  attribution: 'Attribution',
  ai_insights: 'AI Insights',
  retention: 'Retention',
  google_signals: 'Google Signals',
  // Sales
  conversational: 'Conversational',
  meetings: 'Meetings',
  proposals: 'Proposals',
  closing: 'Closing',
  ai_efficiency: 'AI Efficiency',
  quality: 'Quality',
  forecasting: 'Forecasting',
  // Platform
  system: 'System Health',
  edge_functions: 'Edge Functions',
  security: 'Security',
  // Intelligence
  ml_models: 'ML Models',
  churn: 'Churn Risk',
  engagement: 'Engagement',
  // Growth
  applications: 'Applications',
  hiring: 'Hiring',
  revenue: 'Revenue',
  companies: 'Companies',
  referrals: 'Referrals',
  moneybird: 'Moneybird Finance',
  // Costs
  api_usage: 'API Usage',
  cron_jobs: 'Cron Jobs',
  storage: 'Storage',
  budget: 'Budget',
};

// Determine format for KPI
function getKPIFormat(name: string): { format: UnifiedKPI['format']; unit?: string; lowerIsBetter?: boolean } {
  if (name.includes('pct') || name.includes('rate') || name.includes('ratio') || name === 'win_rate' || name.includes('auc')) {
    return { format: 'percent', unit: '%' };
  }
  if (name.includes('value') || name.includes('revenue') || name.includes('deal_size') || 
      name.includes('bonus') || name.includes('cost') || name === 'cpl' || name === 'cpsql' ||
      name.includes('invoices') || name.includes('payouts')) {
    return { format: 'currency', unit: '€' };
  }
  if (name.includes('hours') || name === 'hours_worked') {
    return { format: 'hours', unit: 'h' };
  }
  if (name.includes('days') || name === 'avg_time_to_hire') {
    return { format: 'days', unit: 'd' };
  }
  if (name.includes('duration') || name.includes('lag') || name.includes('response_time') || name.includes('_ms')) {
    return { format: 'ms', unit: 'ms' };
  }
  
  // Lower is better for these
  const lowerIsBetter = ['bounce_rate', 'idle_time_pct', 'slipping_deals', 'churned_deals', 
    'no_shows', 'scope_change_frequency', 'cpl', 'cpsql', 'page_load_time_lcp', 
    'search_to_lead_lag', 'session_to_sql_lag', 'cost_per_placement', 'total_errors_1h',
    'critical_errors_1h', 'churn_critical_count', 'churn_high_count', 'pending_review',
    'rejected_applications', 'overdue_invoices', 'avg_response_time_ms', 'low_engagement_users'].includes(name);
  
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

// Transform Platform Health KPIs
function transformPlatformKPIs(
  systemHealth: { platform_status: string; active_users_1h: number; total_errors_1h: number; critical_errors_1h: number; avg_response_time_ms: number; db_connections: number } | undefined,
  edgeFunctions: { function_name: string; success_rate: number; avg_duration_ms: number }[] | undefined
): UnifiedKPI[] {
  const result: UnifiedKPI[] = [];
  
  if (systemHealth) {
    // System Health KPIs
    result.push({
      id: 'platform_active_users',
      domain: 'platform',
      category: 'system',
      name: 'active_users_1h',
      displayName: 'Active Users (1h)',
      value: systemHealth.active_users_1h || 0,
      targetValue: 10,
      status: systemHealth.active_users_1h >= 10 ? 'success' : systemHealth.active_users_1h >= 5 ? 'warning' : 'neutral',
      format: 'number',
    });
    
    result.push({
      id: 'platform_errors',
      domain: 'platform',
      category: 'system',
      name: 'total_errors_1h',
      displayName: 'Errors (1h)',
      value: systemHealth.total_errors_1h || 0,
      warningThreshold: 10,
      criticalThreshold: 50,
      lowerIsBetter: true,
      status: systemHealth.total_errors_1h >= 50 ? 'critical' : systemHealth.total_errors_1h >= 10 ? 'warning' : 'success',
      format: 'number',
    });
    
    result.push({
      id: 'platform_critical_errors',
      domain: 'platform',
      category: 'system',
      name: 'critical_errors_1h',
      displayName: 'Critical Errors (1h)',
      value: systemHealth.critical_errors_1h || 0,
      warningThreshold: 1,
      criticalThreshold: 5,
      lowerIsBetter: true,
      status: systemHealth.critical_errors_1h >= 5 ? 'critical' : systemHealth.critical_errors_1h >= 1 ? 'warning' : 'success',
      format: 'number',
    });
    
    result.push({
      id: 'platform_response_time',
      domain: 'platform',
      category: 'system',
      name: 'avg_response_time_ms',
      displayName: 'Avg Response Time',
      value: systemHealth.avg_response_time_ms || 0,
      targetValue: 200,
      warningThreshold: 500,
      criticalThreshold: 1000,
      lowerIsBetter: true,
      status: systemHealth.avg_response_time_ms <= 200 ? 'success' : systemHealth.avg_response_time_ms <= 500 ? 'warning' : 'critical',
      format: 'ms',
      unit: 'ms',
    });
    
    result.push({
      id: 'platform_db_connections',
      domain: 'platform',
      category: 'system',
      name: 'db_connections',
      displayName: 'DB Connections',
      value: systemHealth.db_connections || 0,
      warningThreshold: 80,
      criticalThreshold: 95,
      lowerIsBetter: true,
      status: systemHealth.db_connections >= 95 ? 'critical' : systemHealth.db_connections >= 80 ? 'warning' : 'success',
      format: 'number',
    });
  }
  
  // Edge Function KPIs (aggregate)
  if (edgeFunctions && edgeFunctions.length > 0) {
    const avgSuccessRate = edgeFunctions.reduce((sum, f) => sum + (f.success_rate || 0), 0) / edgeFunctions.length;
    const avgDuration = edgeFunctions.reduce((sum, f) => sum + (f.avg_duration_ms || 0), 0) / edgeFunctions.length;
    
    result.push({
      id: 'edge_fn_success_rate',
      domain: 'platform',
      category: 'edge_functions',
      name: 'edge_function_success_rate',
      displayName: 'Edge Fn Success Rate',
      value: avgSuccessRate,
      targetValue: 99,
      warningThreshold: 95,
      criticalThreshold: 90,
      status: avgSuccessRate >= 99 ? 'success' : avgSuccessRate >= 95 ? 'warning' : 'critical',
      format: 'percent',
      unit: '%',
    });
    
    result.push({
      id: 'edge_fn_duration',
      domain: 'platform',
      category: 'edge_functions',
      name: 'edge_function_avg_duration',
      displayName: 'Edge Fn Avg Duration',
      value: avgDuration,
      targetValue: 500,
      warningThreshold: 1000,
      criticalThreshold: 2000,
      lowerIsBetter: true,
      status: avgDuration <= 500 ? 'success' : avgDuration <= 1000 ? 'warning' : 'critical',
      format: 'ms',
      unit: 'ms',
    });
  }
  
  return result;
}

// Transform Security KPIs
function transformSecurityKPIs(
  rlsMetrics: { totalPolicies: number; tablesWithRLS: number; totalTables: number; coveragePercentage: number } | undefined,
  authMetrics: { totalFailures: number; uniqueIPs: number } | undefined,
  rateLimitMetrics: { totalRejections: number } | undefined,
  storageMetrics: { totalBuckets: number; publicBuckets: number; privateBuckets: number } | undefined
): UnifiedKPI[] {
  const result: UnifiedKPI[] = [];
  
  // RLS Coverage
  if (rlsMetrics) {
    result.push({
      id: 'security_rls_coverage',
      domain: 'platform',
      category: 'security',
      name: 'rls_coverage_pct',
      displayName: 'RLS Coverage',
      value: rlsMetrics.coveragePercentage,
      targetValue: 100,
      warningThreshold: 80,
      criticalThreshold: 50,
      status: rlsMetrics.coveragePercentage >= 100 ? 'success' : rlsMetrics.coveragePercentage >= 80 ? 'warning' : 'critical',
      format: 'percent',
      unit: '%',
    });
    
    result.push({
      id: 'security_rls_policies',
      domain: 'platform',
      category: 'security',
      name: 'rls_total_policies',
      displayName: 'Total RLS Policies',
      value: rlsMetrics.totalPolicies,
      targetValue: 20,
      status: rlsMetrics.totalPolicies >= 20 ? 'success' : 'neutral',
      format: 'number',
    });
    
    result.push({
      id: 'security_tables_rls',
      domain: 'platform',
      category: 'security',
      name: 'tables_with_rls',
      displayName: 'Tables with RLS',
      value: rlsMetrics.tablesWithRLS,
      status: 'neutral',
      format: 'number',
      description: `${rlsMetrics.tablesWithRLS} of ${rlsMetrics.totalTables} tables`,
    });
  }
  
  // Auth Failures
  if (authMetrics) {
    result.push({
      id: 'security_auth_failures',
      domain: 'platform',
      category: 'security',
      name: 'auth_failures_24h',
      displayName: 'Auth Failures (24h)',
      value: authMetrics.totalFailures,
      warningThreshold: 50,
      criticalThreshold: 200,
      lowerIsBetter: true,
      status: authMetrics.totalFailures >= 200 ? 'critical' : authMetrics.totalFailures >= 50 ? 'warning' : 'success',
      format: 'number',
    });
    
    result.push({
      id: 'security_auth_ips',
      domain: 'platform',
      category: 'security',
      name: 'auth_unique_ips',
      displayName: 'Unique Failed IPs',
      value: authMetrics.uniqueIPs,
      warningThreshold: 10,
      criticalThreshold: 30,
      lowerIsBetter: true,
      status: authMetrics.uniqueIPs >= 30 ? 'critical' : authMetrics.uniqueIPs >= 10 ? 'warning' : 'success',
      format: 'number',
    });
  }
  
  // Rate Limiting
  if (rateLimitMetrics) {
    result.push({
      id: 'security_rate_limits',
      domain: 'platform',
      category: 'security',
      name: 'rate_limit_rejections',
      displayName: 'Rate Limit Rejections',
      value: rateLimitMetrics.totalRejections,
      warningThreshold: 100,
      criticalThreshold: 500,
      lowerIsBetter: true,
      status: rateLimitMetrics.totalRejections >= 500 ? 'critical' : rateLimitMetrics.totalRejections >= 100 ? 'warning' : 'success',
      format: 'number',
    });
  }
  
  // Storage Buckets
  if (storageMetrics) {
    result.push({
      id: 'security_public_buckets',
      domain: 'platform',
      category: 'security',
      name: 'public_buckets',
      displayName: 'Public Buckets',
      value: storageMetrics.publicBuckets,
      warningThreshold: 3,
      criticalThreshold: 5,
      lowerIsBetter: true,
      status: storageMetrics.publicBuckets >= 5 ? 'critical' : storageMetrics.publicBuckets >= 3 ? 'warning' : 'success',
      format: 'number',
    });
    
    result.push({
      id: 'security_private_buckets',
      domain: 'platform',
      category: 'security',
      name: 'private_buckets',
      displayName: 'Private Buckets',
      value: storageMetrics.privateBuckets,
      status: 'neutral',
      format: 'number',
    });
  }
  
  return result;
}

// Transform Intelligence KPIs
function transformIntelligenceKPIs(
  activeModel: { metrics: { auc_roc?: number } } | null | undefined,
  matchPredictions: any[] | undefined,
  churnRiskUsers: { risk_level: string }[] | undefined,
  engagementStats: { highEngagement: number; mediumEngagement: number; lowEngagement: number; avgEventsPerUser: number } | undefined
): UnifiedKPI[] {
  const result: UnifiedKPI[] = [];
  
  // ML Model KPIs
  if (activeModel?.metrics?.auc_roc) {
    result.push({
      id: 'ml_auc_roc',
      domain: 'intelligence',
      category: 'ml_models',
      name: 'ml_model_auc_roc',
      displayName: 'Model AUC-ROC',
      value: activeModel.metrics.auc_roc * 100,
      targetValue: 85,
      warningThreshold: 70,
      criticalThreshold: 60,
      status: activeModel.metrics.auc_roc >= 0.85 ? 'success' : activeModel.metrics.auc_roc >= 0.70 ? 'warning' : 'critical',
      format: 'percent',
      unit: '%',
    });
  }
  
  result.push({
    id: 'ml_predictions_count',
    domain: 'intelligence',
    category: 'ml_models',
    name: 'ml_predictions_count',
    displayName: 'ML Predictions',
    value: matchPredictions?.length || 0,
    targetValue: 50,
    status: (matchPredictions?.length || 0) >= 50 ? 'success' : 'neutral',
    format: 'number',
  });
  
  // Churn KPIs
  if (churnRiskUsers) {
    const criticalCount = churnRiskUsers.filter(u => u.risk_level === 'critical').length;
    const highCount = churnRiskUsers.filter(u => u.risk_level === 'high').length;
    
    result.push({
      id: 'churn_critical',
      domain: 'intelligence',
      category: 'churn',
      name: 'churn_critical_count',
      displayName: 'Critical Churn Risk',
      value: criticalCount,
      warningThreshold: 3,
      criticalThreshold: 10,
      lowerIsBetter: true,
      status: criticalCount >= 10 ? 'critical' : criticalCount >= 3 ? 'warning' : 'success',
      format: 'number',
    });
    
    result.push({
      id: 'churn_high',
      domain: 'intelligence',
      category: 'churn',
      name: 'churn_high_count',
      displayName: 'High Churn Risk',
      value: highCount,
      warningThreshold: 10,
      criticalThreshold: 25,
      lowerIsBetter: true,
      status: highCount >= 25 ? 'critical' : highCount >= 10 ? 'warning' : 'success',
      format: 'number',
    });
  }
  
  // Engagement KPIs
  if (engagementStats) {
    result.push({
      id: 'engagement_high',
      domain: 'intelligence',
      category: 'engagement',
      name: 'high_engagement_users',
      displayName: 'High Engagement',
      value: engagementStats.highEngagement,
      targetValue: 20,
      status: engagementStats.highEngagement >= 20 ? 'success' : 'neutral',
      format: 'number',
    });
    
    result.push({
      id: 'engagement_medium',
      domain: 'intelligence',
      category: 'engagement',
      name: 'medium_engagement_users',
      displayName: 'Medium Engagement',
      value: engagementStats.mediumEngagement,
      status: 'neutral',
      format: 'number',
    });
    
    result.push({
      id: 'engagement_low',
      domain: 'intelligence',
      category: 'engagement',
      name: 'low_engagement_users',
      displayName: 'Low Engagement',
      value: engagementStats.lowEngagement,
      warningThreshold: 30,
      criticalThreshold: 50,
      lowerIsBetter: true,
      status: engagementStats.lowEngagement >= 50 ? 'critical' : engagementStats.lowEngagement >= 30 ? 'warning' : 'success',
      format: 'number',
    });
    
    result.push({
      id: 'engagement_avg_events',
      domain: 'intelligence',
      category: 'engagement',
      name: 'avg_events_per_user',
      displayName: 'Avg Events/User',
      value: engagementStats.avgEventsPerUser,
      targetValue: 30,
      warningThreshold: 15,
      status: engagementStats.avgEventsPerUser >= 30 ? 'success' : engagementStats.avgEventsPerUser >= 15 ? 'neutral' : 'warning',
      format: 'number',
    });
  }
  
  return result;
}

// Transform Growth KPIs
function transformGrowthKPIs(
  appMetrics: { total_applications: number; pending_review: number; approved: number; rejected: number; new_today: number; approval_rate: number } | undefined,
  platformHealth: { jobsFilledThisMonth: number; activeMeetings: number } | undefined,
  financialStats: { totalPlacementRevenue: number; paidPlacementRevenue: number; outstandingInvoices: number; overdueInvoices: number; pendingPayouts: number } | undefined,
  companyMetrics: { total_companies: number; active_companies: number; new_this_month: number; total_jobs: number; total_followers: number } | undefined,
  referralStats: { totalReferrals: number; hiredReferrals: number; conversionRate: number } | undefined
): UnifiedKPI[] {
  const result: UnifiedKPI[] = [];
  
  // Application KPIs
  if (appMetrics) {
    result.push({
      id: 'growth_total_apps',
      domain: 'growth',
      category: 'applications',
      name: 'total_applications',
      displayName: 'Total Applications',
      value: appMetrics.total_applications,
      status: 'neutral',
      format: 'number',
    });
    
    result.push({
      id: 'growth_pending',
      domain: 'growth',
      category: 'applications',
      name: 'pending_review',
      displayName: 'Pending Review',
      value: appMetrics.pending_review,
      warningThreshold: 20,
      criticalThreshold: 50,
      lowerIsBetter: true,
      status: appMetrics.pending_review >= 50 ? 'critical' : appMetrics.pending_review >= 20 ? 'warning' : 'success',
      format: 'number',
    });
    
    result.push({
      id: 'growth_new_today',
      domain: 'growth',
      category: 'applications',
      name: 'new_today',
      displayName: 'New Today',
      value: appMetrics.new_today,
      targetValue: 5,
      status: appMetrics.new_today >= 5 ? 'success' : 'neutral',
      format: 'number',
    });
    
    result.push({
      id: 'growth_approval_rate',
      domain: 'growth',
      category: 'applications',
      name: 'approval_rate',
      displayName: 'Approval Rate',
      value: appMetrics.approval_rate,
      targetValue: 70,
      warningThreshold: 50,
      criticalThreshold: 30,
      status: appMetrics.approval_rate >= 70 ? 'success' : appMetrics.approval_rate >= 50 ? 'warning' : 'critical',
      format: 'percent',
      unit: '%',
    });
  }
  
  // Hiring KPIs
  if (platformHealth) {
    result.push({
      id: 'growth_jobs_filled',
      domain: 'growth',
      category: 'hiring',
      name: 'jobs_filled_this_month',
      displayName: 'Jobs Filled',
      value: platformHealth.jobsFilledThisMonth,
      targetValue: 5,
      status: platformHealth.jobsFilledThisMonth >= 5 ? 'success' : 'neutral',
      format: 'number',
    });
    
    result.push({
      id: 'growth_active_meetings',
      domain: 'growth',
      category: 'hiring',
      name: 'active_meetings',
      displayName: 'Active Meetings',
      value: platformHealth.activeMeetings,
      targetValue: 10,
      status: platformHealth.activeMeetings >= 10 ? 'success' : 'neutral',
      format: 'number',
    });
  }
  
  // Financial KPIs
  if (financialStats) {
    result.push({
      id: 'growth_placement_revenue',
      domain: 'growth',
      category: 'revenue',
      name: 'total_placement_revenue',
      displayName: 'Placement Revenue',
      value: financialStats.totalPlacementRevenue,
      status: 'neutral',
      format: 'currency',
      unit: '€',
    });
    
    result.push({
      id: 'growth_paid_revenue',
      domain: 'growth',
      category: 'revenue',
      name: 'paid_placement_revenue',
      displayName: 'Paid Revenue',
      value: financialStats.paidPlacementRevenue,
      status: 'neutral',
      format: 'currency',
      unit: '€',
    });
    
    result.push({
      id: 'growth_outstanding',
      domain: 'growth',
      category: 'revenue',
      name: 'outstanding_invoices',
      displayName: 'Outstanding Invoices',
      value: financialStats.outstandingInvoices,
      warningThreshold: 10000,
      criticalThreshold: 50000,
      lowerIsBetter: true,
      status: financialStats.outstandingInvoices >= 50000 ? 'critical' : financialStats.outstandingInvoices >= 10000 ? 'warning' : 'success',
      format: 'currency',
      unit: '€',
    });
    
    result.push({
      id: 'growth_overdue',
      domain: 'growth',
      category: 'revenue',
      name: 'overdue_invoices',
      displayName: 'Overdue Invoices',
      value: financialStats.overdueInvoices,
      warningThreshold: 5000,
      criticalThreshold: 20000,
      lowerIsBetter: true,
      status: financialStats.overdueInvoices >= 20000 ? 'critical' : financialStats.overdueInvoices >= 5000 ? 'warning' : 'success',
      format: 'currency',
      unit: '€',
    });
  }
  
  // Company KPIs
  if (companyMetrics) {
    result.push({
      id: 'growth_total_companies',
      domain: 'growth',
      category: 'companies',
      name: 'total_companies',
      displayName: 'Total Companies',
      value: companyMetrics.total_companies,
      targetValue: 50,
      status: companyMetrics.total_companies >= 50 ? 'success' : 'neutral',
      format: 'number',
    });
    
    result.push({
      id: 'growth_active_companies',
      domain: 'growth',
      category: 'companies',
      name: 'active_companies',
      displayName: 'Active Companies',
      value: companyMetrics.active_companies,
      targetValue: 20,
      status: companyMetrics.active_companies >= 20 ? 'success' : 'neutral',
      format: 'number',
    });
    
    result.push({
      id: 'growth_new_companies',
      domain: 'growth',
      category: 'companies',
      name: 'companies_new_this_month',
      displayName: 'New Companies',
      value: companyMetrics.new_this_month,
      targetValue: 3,
      status: companyMetrics.new_this_month >= 3 ? 'success' : 'neutral',
      format: 'number',
    });
    
    result.push({
      id: 'growth_company_jobs',
      domain: 'growth',
      category: 'companies',
      name: 'total_company_jobs',
      displayName: 'Company Jobs',
      value: companyMetrics.total_jobs,
      status: 'neutral',
      format: 'number',
    });
    
    result.push({
      id: 'growth_followers',
      domain: 'growth',
      category: 'companies',
      name: 'total_followers',
      displayName: 'Total Followers',
      value: companyMetrics.total_followers,
      targetValue: 100,
      status: companyMetrics.total_followers >= 100 ? 'success' : 'neutral',
      format: 'number',
    });
  }
  
  // Referral KPIs
  if (referralStats) {
    result.push({
      id: 'growth_referral_count',
      domain: 'growth',
      category: 'referrals',
      name: 'referral_count',
      displayName: 'Total Referrals',
      value: referralStats.totalReferrals,
      targetValue: 20,
      status: referralStats.totalReferrals >= 20 ? 'success' : 'neutral',
      format: 'number',
    });
    
    result.push({
      id: 'growth_hired_referrals',
      domain: 'growth',
      category: 'referrals',
      name: 'hired_referrals',
      displayName: 'Hired from Referrals',
      value: referralStats.hiredReferrals,
      targetValue: 5,
      status: referralStats.hiredReferrals >= 5 ? 'success' : 'neutral',
      format: 'number',
    });
    
    result.push({
      id: 'growth_referral_conversion',
      domain: 'growth',
      category: 'referrals',
      name: 'referral_conversion_rate',
      displayName: 'Referral Conversion',
      value: referralStats.conversionRate,
      targetValue: 20,
      warningThreshold: 10,
      status: referralStats.conversionRate >= 20 ? 'success' : referralStats.conversionRate >= 10 ? 'neutral' : 'warning',
      format: 'percent',
      unit: '%',
    });
  }
  
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
  // Original 3 domains
  const { data: operationsData, isLoading: opsLoading, refetch: refetchOps } = useKPIMetrics(period);
  const { data: websiteData, isLoading: webLoading, refetch: refetchWeb } = useLatestWebKPIs();
  const { data: salesData, isLoading: salesLoading, refetch: refetchSales } = useGroupedSalesKPIs();
  
  // Platform & Security
  const { health: systemHealth, functions: edgeFunctions, isLoading: platformLoading, refetch: refetchPlatform } = useSystemHealth();
  const { rlsMetrics, authMetrics, rateLimitMetrics, storageMetrics, isLoading: securityLoading } = useSecurityMetrics();
  
  // Intelligence
  const { activeModel, matchPredictions, churnRiskUsers, engagementStats, isLoading: intelligenceLoading, refetchChurn, refetchModel } = usePredictiveAnalytics();
  
  // Growth
  const { metrics: appMetrics, isLoading: appLoading } = useApplicationMetrics();
  const platformHealthResult = usePlatformHealth();
  const platformHealthMetrics = platformHealthResult.data;
  const healthLoading = platformHealthResult.isLoading;
  const financialResult = useFinancialStats();
  const financialStats = financialResult.data;
  const financialLoading = financialResult.isLoading;
  const { metrics: companyMetrics, isLoading: companyLoading } = useCompanyMetrics();
  
  // Moneybird Financial KPIs
  const { kpis: moneybirdKPIs, isLoading: moneybirdLoading } = useMoneybirdFinancialKPIs();
  
  // Referral stats query
  const { data: referralStats, isLoading: referralLoading } = useQuery({
    queryKey: ['kpi-referral-stats'],
    queryFn: async () => {
      try {
        const { count: totalCount } = await (supabase as any)
          .from('referrals')
          .select('*', { count: 'exact', head: true });
        
        const { count: hiredCount } = await (supabase as any)
          .from('referrals')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'hired');
        
        const total = totalCount || 0;
        const hired = hiredCount || 0;
        const conversionRate = total > 0 ? Math.round((hired / total) * 100) : 0;
        
        return {
          totalReferrals: total,
          hiredReferrals: hired,
          conversionRate,
        };
      } catch {
        // Table may not exist, return defaults
        return { totalReferrals: 0, hiredReferrals: 0, conversionRate: 0 };
      }
    },
    refetchInterval: 300000, // 5 minutes
  });
  
  const isLoading = opsLoading || webLoading || salesLoading || platformLoading || securityLoading || 
    intelligenceLoading || appLoading || healthLoading || financialLoading || companyLoading || referralLoading || moneybirdLoading;
  
  // Transform all KPIs
  const operationsKPIs = transformOperationsKPIs(operationsData as unknown as Record<string, KPIMetric[]> | undefined);
  const websiteKPIs = transformWebsiteKPIs(websiteData);
  const salesKPIs = transformSalesKPIs(salesData);
  const platformKPIs = transformPlatformKPIs(systemHealth, edgeFunctions);
  const securityKPIs = transformSecurityKPIs(rlsMetrics, authMetrics, rateLimitMetrics, storageMetrics);
  const intelligenceKPIs = transformIntelligenceKPIs(activeModel, matchPredictions, churnRiskUsers, engagementStats);
  const growthKPIs = transformGrowthKPIs(appMetrics, platformHealthMetrics, financialStats, companyMetrics, referralStats);
  
  // Transform Moneybird KPIs to UnifiedKPI format
  const financialUnifiedKPIs: UnifiedKPI[] = moneybirdKPIs.map(kpi => ({
    id: `moneybird_${kpi.id}`,
    domain: 'growth' as KPIDomain,
    category: 'moneybird',
    name: kpi.name,
    displayName: kpi.displayName,
    value: kpi.value,
    previousValue: kpi.previousValue,
    targetValue: kpi.targetValue,
    warningThreshold: kpi.warningThreshold,
    criticalThreshold: kpi.criticalThreshold,
    status: kpi.status,
    format: kpi.format === 'currency' ? 'currency' : kpi.format === 'percent' ? 'percent' : 'number',
    unit: kpi.unit,
    lowerIsBetter: kpi.lowerIsBetter,
  }));
  
  const allKPIs = [...operationsKPIs, ...websiteKPIs, ...salesKPIs, ...platformKPIs, ...securityKPIs, ...intelligenceKPIs, ...growthKPIs, ...financialUnifiedKPIs];
  
  // Calculate domain health
  const operationsHealth = calculateDomainHealth(allKPIs, 'operations', 'Operations');
  const websiteHealth = calculateDomainHealth(allKPIs, 'website', 'Website');
  const salesHealth = calculateDomainHealth(allKPIs, 'sales', 'Sales');
  const platformHealth = calculateDomainHealth(allKPIs, 'platform', 'Platform');
  const intelligenceHealth = calculateDomainHealth(allKPIs, 'intelligence', 'Intelligence');
  const growthHealth = calculateDomainHealth(allKPIs, 'growth', 'Growth');
  
  // Costs domain health - calculated separately as it uses different metrics
  const costsHealth: DomainHealth = {
    domain: 'costs',
    label: 'Costs',
    healthScore: 85, // Will be calculated based on budget thresholds
    totalKPIs: 4,
    onTarget: 4,
    warnings: 0,
    critical: 0,
    categories: [
      { name: 'api_usage', displayName: 'API Usage', healthScore: 90, kpiCount: 1, onTarget: 1, warnings: 0, critical: 0 },
      { name: 'cron_jobs', displayName: 'Cron Jobs', healthScore: 85, kpiCount: 1, onTarget: 1, warnings: 0, critical: 0 },
      { name: 'storage', displayName: 'Storage', healthScore: 80, kpiCount: 1, onTarget: 1, warnings: 0, critical: 0 },
      { name: 'budget', displayName: 'Budget', healthScore: 85, kpiCount: 1, onTarget: 1, warnings: 0, critical: 0 },
    ],
  };
  
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
    platform: platformKPIs,
    intelligence: intelligenceKPIs,
    growth: growthKPIs,
  };
  
  // Group by category
  const byCategory = allKPIs.reduce((acc, kpi) => {
    const key = `${kpi.domain}:${kpi.category}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(kpi);
    return acc;
  }, {} as Record<string, UnifiedKPI[]>);
  
  // Refresh all - call unified KPI calculator then refetch
  const refreshAll = async () => {
    try {
      // Call the unified KPI calculator edge function
      await supabase.functions.invoke('calculate-all-kpis', {
        body: {},
      });
    } catch (error) {
      console.error('Error calling calculate-all-kpis:', error);
    }
    
    // Then refetch all data
    await Promise.all([
      refetchOps(), 
      refetchWeb(), 
      refetchSales(), 
      refetchPlatform(),
      refetchChurn(),
      refetchModel(),
    ]);
  };
  
  return {
    isLoading,
    allKPIs,
    byDomain,
    byCategory,
    domainHealth: [operationsHealth, websiteHealth, salesHealth, platformHealth, intelligenceHealth, growthHealth, costsHealth],
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
  const insights: { type: 'warning' | 'success' | 'info'; message: string; action?: string }[] = [];
  
  // Website + Sales correlations
  const cpl = kpis.find(k => k.name === 'cpl');
  const landingCR = kpis.find(k => k.name === 'landing_page_conversion_rate');
  if (cpl && landingCR && cpl.status === 'warning' && landingCR.status !== 'success') {
    insights.push({
      type: 'warning',
      message: 'High CPL correlating with low Landing Page CR',
      action: 'A/B test landing pages before increasing ad spend',
    });
  }
  
  // Operations + Experience
  const showRate = kpis.find(k => k.name === 'show_rate');
  const npsCandidate = kpis.find(k => k.name === 'nps_candidate');
  if (showRate && npsCandidate && showRate.status === 'success' && npsCandidate.status === 'success') {
    insights.push({
      type: 'success',
      message: 'High Show Rate correlating with strong NPS Candidate Score',
      action: 'Maintain current call confirmation flow',
    });
  }
  
  // Platform + Intelligence
  const criticalErrors = kpis.find(k => k.name === 'critical_errors_1h');
  const lowEngagement = kpis.find(k => k.name === 'low_engagement_users');
  if (criticalErrors && lowEngagement && criticalErrors.status !== 'success' && lowEngagement.status !== 'success') {
    insights.push({
      type: 'warning',
      message: 'System errors correlating with declining engagement',
      action: 'Prioritize error resolution to prevent user churn',
    });
  }
  
  // Intelligence + Growth
  const churnCritical = kpis.find(k => k.name === 'churn_critical_count');
  const approvalRate = kpis.find(k => k.name === 'approval_rate');
  if (churnCritical && churnCritical.status === 'critical') {
    insights.push({
      type: 'warning',
      message: `${churnCritical.value} users at critical churn risk`,
      action: 'Trigger immediate re-engagement campaign',
    });
  }
  
  // Financial
  const overdueInvoices = kpis.find(k => k.name === 'overdue_invoices');
  if (overdueInvoices && overdueInvoices.status !== 'success') {
    insights.push({
      type: 'warning',
      message: 'Overdue invoices require attention',
      action: 'Follow up with clients on outstanding payments',
    });
  }
  
  // ML Model
  const mlAuc = kpis.find(k => k.name === 'ml_model_auc_roc');
  if (mlAuc && mlAuc.status === 'success') {
    insights.push({
      type: 'success',
      message: 'ML model performing well with high accuracy',
      action: 'Continue using AI-powered candidate matching',
    });
  }
  
  // Success state
  const winRate = kpis.find(k => k.name === 'win_rate');
  if (winRate && winRate.status === 'success') {
    insights.push({
      type: 'info',
      message: 'Pipeline Win Rate stable with optimized hiring cycle',
      action: 'Process optimization working; maintain current approach',
    });
  }
  
  return insights;
}

export { categoryDisplayNames };

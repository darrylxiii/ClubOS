import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebKPIResult {
  category: string;
  kpi_name: string;
  value: number;
  target_value?: number;
  threshold_warning?: number;
  threshold_critical?: number;
  trend_direction?: string;
  trend_percentage?: number;
  metadata?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const kpis: WebKPIResult[] = [];

    // ===== NORTH STAR METRICS =====
    
    // Get ad campaign data for CPL/CPSQL
    const { data: adData } = await supabase
      .from('ad_campaigns')
      .select('*')
      .gte('date', thirtyDaysAgo);

    const totalSpend = adData?.reduce((sum, c) => sum + (Number(c.spend) || 0), 0) || 0;
    const totalConversions = adData?.reduce((sum, c) => sum + (c.conversions || 0), 0) || 0;

    // Get lead data
    const { data: leadData, count: totalLeads } = await supabase
      .from('lead_scores')
      .select('*', { count: 'exact' })
      .gte('created_at', thirtyDaysAgo);

    const sqlLeads = leadData?.filter(l => l.is_sql).length || 0;

    // CPL (Cost per Lead)
    const cpl = totalLeads && totalLeads > 0 ? totalSpend / totalLeads : 0;
    kpis.push({
      category: 'north_star',
      kpi_name: 'cpl',
      value: Math.round(cpl * 100) / 100,
      target_value: 150,
      threshold_warning: 175,
      threshold_critical: 200,
      metadata: { total_spend: totalSpend, total_leads: totalLeads }
    });

    // CPSQL (Cost per Sales Qualified Lead)
    const cpsql = sqlLeads > 0 ? totalSpend / sqlLeads : 0;
    kpis.push({
      category: 'north_star',
      kpi_name: 'cpsql',
      value: Math.round(cpsql * 100) / 100,
      target_value: 300,
      threshold_warning: 400,
      threshold_critical: 500,
      metadata: { sql_leads: sqlLeads }
    });

    // Landing Page Conversion Rate (from user_page_analytics)
    const { data: pageData } = await supabase
      .from('user_page_analytics')
      .select('unique_visitors')
      .gte('created_at', thirtyDaysAgo);

    const totalSessions = pageData?.reduce((sum, p) => sum + (p.unique_visitors || 0), 0) || 1;
    const landingPageCR = totalLeads ? (totalLeads / totalSessions) * 100 : 0;
    kpis.push({
      category: 'north_star',
      kpi_name: 'landing_page_conversion_rate',
      value: Math.round(landingPageCR * 100) / 100,
      target_value: 5,
      threshold_warning: 3,
      threshold_critical: 2
    });

    // Search-to-Lead Lag (avg hours)
    const avgTimeToQualify = leadData?.length 
      ? leadData.reduce((sum, l) => sum + (l.time_to_qualify_hours || 24), 0) / leadData.length 
      : 0;
    kpis.push({
      category: 'north_star',
      kpi_name: 'search_to_lead_lag',
      value: Math.round(avgTimeToQualify * 10) / 10,
      target_value: 24,
      threshold_warning: 48,
      threshold_critical: 72
    });

    // ===== PERFORMANCE & FUNNEL METRICS =====

    // Sessions by channel
    const channelSessions = {
      organic: leadData?.filter(l => l.source_channel === 'organic').length || 0,
      paid: leadData?.filter(l => l.source_channel === 'paid').length || 0,
      referral: leadData?.filter(l => l.source_channel === 'referral').length || 0,
      direct: leadData?.filter(l => l.source_channel === 'direct').length || 0,
    };

    kpis.push({
      category: 'funnel',
      kpi_name: 'sessions_organic',
      value: channelSessions.organic,
      metadata: { channel: 'organic' }
    });

    kpis.push({
      category: 'funnel',
      kpi_name: 'sessions_paid',
      value: channelSessions.paid,
      metadata: { channel: 'paid' }
    });

    kpis.push({
      category: 'funnel',
      kpi_name: 'sessions_referral',
      value: channelSessions.referral,
      metadata: { channel: 'referral' }
    });

    // Impressions
    const brandImpressions = adData?.reduce((sum, c) => sum + (c.brand_impressions || 0), 0) || 0;
    const nonBrandImpressions = adData?.reduce((sum, c) => sum + (c.non_brand_impressions || 0), 0) || 0;

    kpis.push({
      category: 'funnel',
      kpi_name: 'impressions_brand',
      value: brandImpressions
    });

    kpis.push({
      category: 'funnel',
      kpi_name: 'impressions_non_brand',
      value: nonBrandImpressions
    });

    // CTR
    const totalImpressions = adData?.reduce((sum, c) => sum + (c.impressions || 0), 0) || 1;
    const totalClicks = adData?.reduce((sum, c) => sum + (c.clicks || 0), 0) || 0;
    const overallCTR = (totalClicks / totalImpressions) * 100;

    kpis.push({
      category: 'funnel',
      kpi_name: 'ctr',
      value: Math.round(overallCTR * 100) / 100,
      target_value: 2,
      threshold_warning: 1.5,
      threshold_critical: 1
    });

    // Bounce Rate (from user_page_analytics)
    const { data: bounceData } = await supabase
      .from('user_page_analytics')
      .select('bounce_rate')
      .gte('created_at', sevenDaysAgo);

    const avgBounceRate = bounceData?.length 
      ? bounceData.reduce((sum, p) => sum + (p.bounce_rate || 0), 0) / bounceData.length 
      : 0;

    kpis.push({
      category: 'funnel',
      kpi_name: 'bounce_rate',
      value: Math.round(avgBounceRate * 100) / 100,
      target_value: 40,
      threshold_warning: 50,
      threshold_critical: 60
    });

    // Core Web Vitals
    const { data: cwvData } = await supabase
      .from('web_performance_metrics')
      .select('*')
      .gte('date', sevenDaysAgo);

    const avgLCP = cwvData?.length 
      ? cwvData.reduce((sum, m) => sum + (Number(m.lcp_ms) || 0), 0) / cwvData.length 
      : 0;

    kpis.push({
      category: 'funnel',
      kpi_name: 'page_load_time_lcp',
      value: Math.round(avgLCP),
      target_value: 2500,
      threshold_warning: 3000,
      threshold_critical: 4000
    });

    // ===== ATTRIBUTION METRICS =====

    // Lead Attribution Mix
    const totalLeadCount = leadData?.length || 1;
    kpis.push({
      category: 'attribution',
      kpi_name: 'lead_attribution_organic_pct',
      value: Math.round((channelSessions.organic / totalLeadCount) * 100)
    });

    kpis.push({
      category: 'attribution',
      kpi_name: 'lead_attribution_paid_pct',
      value: Math.round((channelSessions.paid / totalLeadCount) * 100)
    });

    kpis.push({
      category: 'attribution',
      kpi_name: 'lead_attribution_referral_pct',
      value: Math.round((channelSessions.referral / totalLeadCount) * 100)
    });

    // Session to SQL Lag
    const sqlLeadData = leadData?.filter(l => l.is_sql) || [];
    const avgSessionToSQL = sqlLeadData.length 
      ? sqlLeadData.reduce((sum, l) => sum + (l.time_to_qualify_hours || 0), 0) / sqlLeadData.length 
      : 0;

    kpis.push({
      category: 'attribution',
      kpi_name: 'session_to_sql_lag',
      value: Math.round(avgSessionToSQL * 10) / 10,
      target_value: 48,
      threshold_warning: 72,
      threshold_critical: 120
    });

    // ===== AI INSIGHTS =====

    const { data: aiScores } = await supabase
      .from('content_ai_scores')
      .select('*')
      .order('analyzed_at', { ascending: false })
      .limit(50);

    const avgClarity = aiScores?.length 
      ? aiScores.reduce((sum, s) => sum + (Number(s.content_clarity_score) || 0), 0) / aiScores.length 
      : 0;

    kpis.push({
      category: 'ai_insights',
      kpi_name: 'content_clarity_avg',
      value: Math.round(avgClarity * 10) / 10,
      target_value: 8,
      threshold_warning: 6,
      threshold_critical: 5
    });

    const avgSentiment = aiScores?.length 
      ? aiScores.reduce((sum, s) => sum + (Number(s.sentiment_score) || 0), 0) / aiScores.length 
      : 0;

    kpis.push({
      category: 'ai_insights',
      kpi_name: 'emotional_load_score',
      value: Math.round(avgSentiment * 100) / 100
    });

    const avgHeatTrigger = aiScores?.length 
      ? aiScores.reduce((sum, s) => sum + (Number(s.heat_trigger_ratio) || 0), 0) / aiScores.length 
      : 0;

    kpis.push({
      category: 'ai_insights',
      kpi_name: 'heat_trigger_ratio',
      value: Math.round(avgHeatTrigger * 100) / 100,
      target_value: 0.5,
      threshold_warning: 0.3,
      threshold_critical: 0.2
    });

    // ===== RETENTION & RE-ENGAGEMENT =====

    // Returning Visitor %
    const { data: sessionData } = await supabase
      .from('user_session_events')
      .select('user_id, session_id')
      .gte('created_at', thirtyDaysAgo);

    const uniqueUsers = new Set(sessionData?.map(s => s.user_id) || []);
    const sessionsPerUser: Record<string, number> = {};
    sessionData?.forEach(s => {
      if (s.user_id) {
        sessionsPerUser[s.user_id] = (sessionsPerUser[s.user_id] || 0) + 1;
      }
    });
    const returningUsers = Object.values(sessionsPerUser).filter(count => count > 1).length;
    const returningVisitorPct = uniqueUsers.size > 0 ? (returningUsers / uniqueUsers.size) * 100 : 0;

    kpis.push({
      category: 'retention',
      kpi_name: 'returning_visitor_pct',
      value: Math.round(returningVisitorPct * 10) / 10,
      target_value: 30,
      threshold_warning: 20,
      threshold_critical: 15
    });

    // Retarget Conversion Rate
    const retargetLeads = leadData?.filter(l => l.utm_campaign?.includes('retarget') || l.utm_campaign?.includes('remarketing')).length || 0;
    const retargetCR = totalLeadCount > 0 ? (retargetLeads / totalLeadCount) * 100 : 0;

    kpis.push({
      category: 'retention',
      kpi_name: 'retarget_conversion_rate',
      value: Math.round(retargetCR * 100) / 100
    });

    // ===== GOOGLE SIGNALS =====

    // Branded vs Non-Branded CTR
    const brandedCTR = brandImpressions > 0 ? (totalClicks * 0.6 / brandImpressions) * 100 : 0;
    const nonBrandedCTR = nonBrandImpressions > 0 ? (totalClicks * 0.4 / nonBrandImpressions) * 100 : 0;

    kpis.push({
      category: 'google_signals',
      kpi_name: 'branded_ctr',
      value: Math.round(brandedCTR * 100) / 100,
      target_value: 2.5
    });

    kpis.push({
      category: 'google_signals',
      kpi_name: 'non_branded_ctr',
      value: Math.round(nonBrandedCTR * 100) / 100,
      target_value: 1.5
    });

    // GCLID Capture Success
    const totalAdSessions = adData?.reduce((sum, c) => sum + (c.total_sessions || 0), 0) || 1;
    const gclidCaptured = adData?.reduce((sum, c) => sum + (c.gclid_capture_count || 0), 0) || 0;
    const gclidCaptureRate = (gclidCaptured / totalAdSessions) * 100;

    kpis.push({
      category: 'google_signals',
      kpi_name: 'gclid_capture_success',
      value: Math.round(gclidCaptureRate * 10) / 10,
      target_value: 95,
      threshold_warning: 90,
      threshold_critical: 85
    });

    // Core Web Vitals Pass Rate
    const cwvPassCount = cwvData?.filter(m => m.cwv_pass).length || 0;
    const cwvPassRate = cwvData?.length ? (cwvPassCount / cwvData.length) * 100 : 0;

    kpis.push({
      category: 'google_signals',
      kpi_name: 'cwv_pass_rate',
      value: Math.round(cwvPassRate * 10) / 10,
      target_value: 100,
      threshold_warning: 90,
      threshold_critical: 75
    });

    // SQLs from Search Campaign
    const searchSQLs = leadData?.filter(l => l.is_sql && l.utm_source === 'google').length || 0;

    kpis.push({
      category: 'google_signals',
      kpi_name: 'sqls_from_search',
      value: searchSQLs,
      target_value: 15
    });

    // Store all KPIs
    for (const kpi of kpis) {
      await supabase
        .from('web_kpi_metrics')
        .upsert({
          category: kpi.category,
          kpi_name: kpi.kpi_name,
          value: kpi.value,
          target_value: kpi.target_value,
          threshold_warning: kpi.threshold_warning,
          threshold_critical: kpi.threshold_critical,
          trend_direction: kpi.trend_direction,
          trend_percentage: kpi.trend_percentage,
          period_type: 'daily',
          period_date: today,
          metadata: kpi.metadata || {},
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'category,kpi_name,period_date',
          ignoreDuplicates: false
        });
    }

    console.log(`Calculated ${kpis.length} web KPIs successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        kpis_calculated: kpis.length,
        categories: {
          north_star: kpis.filter(k => k.category === 'north_star').length,
          funnel: kpis.filter(k => k.category === 'funnel').length,
          attribution: kpis.filter(k => k.category === 'attribution').length,
          ai_insights: kpis.filter(k => k.category === 'ai_insights').length,
          retention: kpis.filter(k => k.category === 'retention').length,
          google_signals: kpis.filter(k => k.category === 'google_signals').length,
        },
        kpis 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error calculating web KPIs:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KPIResult {
  domain: string;
  category: string;
  kpi_name: string;
  value: number;
  previous_value?: number;
  target_value?: number;
  period_type: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const results: { operations: KPIResult[]; website: KPIResult[]; sales: KPIResult[] } = {
      operations: [],
      website: [],
      sales: [],
    };

    console.log('[calculate-all-kpis] Starting unified KPI calculation...');

    // ============================================
    // OPERATIONS KPIs (from existing data sources)
    // ============================================

    // Workforce: Tasks from unified_tasks
    const { count: tasksCompleted } = await supabase
      .from('unified_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'done')
      .gte('completed_at', sevenDaysAgo.toISOString());

    const { count: tasksTotal } = await supabase
      .from('unified_tasks')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());

    const taskCompletionPct = tasksTotal ? ((tasksCompleted || 0) / tasksTotal) * 100 : 0;

    results.operations.push(
      { domain: 'operations', category: 'workforce', kpi_name: 'tasks_completed', value: tasksCompleted || 0, period_type: 'weekly' },
      { domain: 'operations', category: 'workforce', kpi_name: 'task_completion_pct', value: Math.round(taskCompletionPct * 10) / 10, period_type: 'weekly' }
    );

    // Pipeline: From jobs table
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, status, is_lost')
      .gte('updated_at', sevenDaysAgo.toISOString());

    const pipelinesOpen = jobs?.filter(j => j.status === 'published').length || 0;
    const pipelinesClosed = jobs?.filter(j => j.status === 'closed' && !j.is_lost).length || 0;
    const pipelinesLost = jobs?.filter(j => j.is_lost).length || 0;
    const pipelineWinRate = (pipelinesClosed + pipelinesLost) > 0 
      ? (pipelinesClosed / (pipelinesClosed + pipelinesLost)) * 100 : 0;

    results.operations.push(
      { domain: 'operations', category: 'pipeline', kpi_name: 'pipelines_open', value: pipelinesOpen, period_type: 'weekly' },
      { domain: 'operations', category: 'pipeline', kpi_name: 'pipelines_closed', value: pipelinesClosed, period_type: 'weekly' },
      { domain: 'operations', category: 'pipeline', kpi_name: 'pipelines_lost', value: pipelinesLost, period_type: 'weekly' },
      { domain: 'operations', category: 'pipeline', kpi_name: 'pipeline_win_rate', value: Math.round(pipelineWinRate * 10) / 10, period_type: 'weekly' }
    );

    // Recruitment: From applications
    const { data: applications } = await supabase
      .from('applications')
      .select('id, status, applied_at')
      .gte('created_at', sevenDaysAgo.toISOString());

    const offers = applications?.filter(a => ['offer', 'hired'].includes(a.status)).length || 0;
    const shortlisted = applications?.filter(a => ['screening', 'interview', 'offer', 'hired'].includes(a.status)).length || 0;
    const ctoScore = shortlisted > 0 ? (offers / shortlisted) * 100 : 0;

    // Meetings
    const { count: candidateMeetings } = await supabase
      .from('meetings')
      .select('*', { count: 'exact', head: true })
      .eq('meeting_type', 'interview')
      .gte('scheduled_start', sevenDaysAgo.toISOString());

    const { count: clientMeetings } = await supabase
      .from('meetings')
      .select('*', { count: 'exact', head: true })
      .eq('meeting_type', 'client_call')
      .gte('scheduled_start', sevenDaysAgo.toISOString());

    results.operations.push(
      { domain: 'operations', category: 'recruitment', kpi_name: 'cto_score', value: Math.round(ctoScore * 10) / 10, period_type: 'weekly' },
      { domain: 'operations', category: 'recruitment', kpi_name: 'candidate_meetings', value: candidateMeetings || 0, period_type: 'weekly' },
      { domain: 'operations', category: 'recruitment', kpi_name: 'client_meetings', value: clientMeetings || 0, period_type: 'weekly' }
    );

    // Experience: From applications referrals
    const { count: totalApps } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());

    const { count: referralApps } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('application_source', 'referral')
      .gte('created_at', sevenDaysAgo.toISOString());

    const referralRate = totalApps ? ((referralApps || 0) / totalApps) * 100 : 0;

    results.operations.push(
      { domain: 'operations', category: 'experience', kpi_name: 'referral_rate', value: Math.round(referralRate * 10) / 10, period_type: 'weekly' }
    );

    // ============================================
    // WEBSITE KPIs (from user_page_analytics & user_session_events)
    // ============================================

    // Sessions from user_page_analytics
    const { data: pageAnalytics } = await supabase
      .from('user_page_analytics')
      .select('unique_visitors, total_visits, bounce_rate, avg_time_on_page')
      .gte('created_at', sevenDaysAgo.toISOString());

    const totalSessions = pageAnalytics?.reduce((sum, p) => sum + (p.total_visits || 0), 0) || 0;
    const totalUniqueVisitors = pageAnalytics?.reduce((sum, p) => sum + (p.unique_visitors || 0), 0) || 0;
    const avgBounceRate = pageAnalytics?.length 
      ? pageAnalytics.reduce((sum, p) => sum + (p.bounce_rate || 0), 0) / pageAnalytics.length : 0;

    results.website.push(
      { domain: 'website', category: 'funnel', kpi_name: 'total_sessions', value: totalSessions, period_type: 'daily' },
      { domain: 'website', category: 'funnel', kpi_name: 'unique_visitors', value: totalUniqueVisitors, period_type: 'daily' },
      { domain: 'website', category: 'funnel', kpi_name: 'bounce_rate', value: Math.round(avgBounceRate * 10) / 10, target_value: 40, period_type: 'daily' }
    );

    // Returning visitors from user_session_events
    const { data: sessionEvents } = await supabase
      .from('user_session_events')
      .select('user_id, session_id')
      .gte('created_at', thirtyDaysAgo.toISOString());

    const sessionsPerUser: Record<string, number> = {};
    sessionEvents?.forEach(s => {
      if (s.user_id) {
        sessionsPerUser[s.user_id] = (sessionsPerUser[s.user_id] || 0) + 1;
      }
    });
    const uniqueUsers = Object.keys(sessionsPerUser).length;
    const returningUsers = Object.values(sessionsPerUser).filter(count => count > 1).length;
    const returningVisitorPct = uniqueUsers > 0 ? (returningUsers / uniqueUsers) * 100 : 0;

    results.website.push(
      { domain: 'website', category: 'retention', kpi_name: 'returning_visitor_pct', value: Math.round(returningVisitorPct * 10) / 10, target_value: 30, period_type: 'daily' }
    );

    // Ad campaigns data
    const { data: adData } = await supabase
      .from('ad_campaigns')
      .select('spend, conversions, clicks, impressions')
      .gte('date', sevenDaysAgo.toISOString().split('T')[0]);

    const totalSpend = adData?.reduce((sum, c) => sum + (Number(c.spend) || 0), 0) || 0;
    const totalConversions = adData?.reduce((sum, c) => sum + (c.conversions || 0), 0) || 0;
    const totalClicks = adData?.reduce((sum, c) => sum + (c.clicks || 0), 0) || 0;
    const totalImpressions = adData?.reduce((sum, c) => sum + (c.impressions || 0), 0) || 1;

    const cpl = totalConversions > 0 ? totalSpend / totalConversions : 0;
    const ctr = (totalClicks / totalImpressions) * 100;

    results.website.push(
      { domain: 'website', category: 'north_star', kpi_name: 'cpl', value: Math.round(cpl * 100) / 100, target_value: 150, period_type: 'daily' },
      { domain: 'website', category: 'funnel', kpi_name: 'ctr', value: Math.round(ctr * 100) / 100, target_value: 2.5, period_type: 'daily' },
      { domain: 'website', category: 'funnel', kpi_name: 'total_ad_spend', value: Math.round(totalSpend * 100) / 100, period_type: 'daily' }
    );

    // ============================================
    // SALES KPIs (from crm_prospects, bookings, meetings)
    // ============================================

    // CRM Prospects as sales conversations
    const { data: prospects } = await supabase
      .from('crm_prospects')
      .select('id, stage, score, deal_value')
      .gte('created_at', sevenDaysAgo.toISOString());

    const totalProspects = prospects?.length || 0;
    const qualifiedProspects = prospects?.filter(p => ['qualified', 'negotiation', 'won'].includes(p.stage || '')).length || 0;
    const wonProspects = prospects?.filter(p => p.stage === 'won').length || 0;
    const lostProspects = prospects?.filter(p => p.stage === 'lost').length || 0;

    const qualificationRate = totalProspects > 0 ? (qualifiedProspects / totalProspects) * 100 : 0;
    const salesWinRate = (wonProspects + lostProspects) > 0 ? (wonProspects / (wonProspects + lostProspects)) * 100 : 0;
    const totalDealValue = prospects?.filter(p => p.stage === 'won').reduce((sum, p) => sum + (p.deal_value || 0), 0) || 0;

    results.sales.push(
      { domain: 'sales', category: 'conversational', kpi_name: 'initial_conversations', value: totalProspects, period_type: 'daily' },
      { domain: 'sales', category: 'conversational', kpi_name: 'qualified_conversations', value: qualifiedProspects, period_type: 'daily' },
      { domain: 'sales', category: 'conversational', kpi_name: 'qualification_rate', value: Math.round(qualificationRate * 10) / 10, target_value: 30, period_type: 'daily' },
      { domain: 'sales', category: 'closing', kpi_name: 'deals_closed_won', value: wonProspects, target_value: 5, period_type: 'daily' },
      { domain: 'sales', category: 'closing', kpi_name: 'win_rate', value: Math.round(salesWinRate * 10) / 10, target_value: 50, period_type: 'daily' },
      { domain: 'sales', category: 'closing', kpi_name: 'total_revenue', value: totalDealValue, period_type: 'daily' }
    );

    // Bookings as discovery calls
    const { count: bookingsTotal } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('scheduled_start', sevenDaysAgo.toISOString());

    const { count: bookingsAttended } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('scheduled_start', sevenDaysAgo.toISOString())
      .eq('status', 'completed');

    const showRate = bookingsTotal ? ((bookingsAttended || 0) / bookingsTotal) * 100 : 0;

    results.sales.push(
      { domain: 'sales', category: 'meetings', kpi_name: 'discovery_calls_held', value: bookingsAttended || 0, target_value: 20, period_type: 'daily' },
      { domain: 'sales', category: 'meetings', kpi_name: 'show_rate', value: Math.round(showRate * 10) / 10, target_value: 80, period_type: 'daily' }
    );

    // AI Outreach effectiveness
    const { count: aiMessagesSent } = await supabase
      .from('ai_outreach_logs')
      .select('*', { count: 'exact', head: true })
      .gte('sent_at', sevenDaysAgo.toISOString());

    const { count: aiMessagesReplied } = await supabase
      .from('ai_outreach_logs')
      .select('*', { count: 'exact', head: true })
      .gte('sent_at', sevenDaysAgo.toISOString())
      .not('replied_at', 'is', null);

    const aiReplyRate = aiMessagesSent ? ((aiMessagesReplied || 0) / aiMessagesSent) * 100 : 0;

    results.sales.push(
      { domain: 'sales', category: 'ai_efficiency', kpi_name: 'ai_messages_sent', value: aiMessagesSent || 0, period_type: 'daily' },
      { domain: 'sales', category: 'ai_efficiency', kpi_name: 'ai_reply_rate', value: Math.round(aiReplyRate * 10) / 10, target_value: 10, period_type: 'daily' }
    );

    // ============================================
    // STORE ALL KPIs
    // ============================================

    console.log(`[calculate-all-kpis] Storing ${results.operations.length} operations, ${results.website.length} website, ${results.sales.length} sales KPIs`);

    // Update operations KPIs in kpi_metrics
    for (const kpi of results.operations) {
      // Get previous value
      const { data: existing } = await supabase
        .from('kpi_metrics')
        .select('value')
        .eq('kpi_name', kpi.kpi_name)
        .eq('category', kpi.category)
        .single();

      await supabase.from('kpi_metrics').upsert({
        category: kpi.category,
        kpi_name: kpi.kpi_name,
        value: kpi.value,
        previous_value: existing?.value || 0,
        period_type: kpi.period_type,
        period_start: sevenDaysAgo.toISOString().split('T')[0],
        period_end: today,
        updated_at: now.toISOString(),
      }, { onConflict: 'category,kpi_name,period_type' });
    }

    // Update website KPIs - delete existing and insert new
    for (const kpi of results.website) {
      // Delete existing record for this KPI
      await supabase
        .from('web_kpi_metrics')
        .delete()
        .eq('kpi_name', kpi.kpi_name)
        .eq('category', kpi.category);

      // Insert new record
      await supabase.from('web_kpi_metrics').insert({
        category: kpi.category,
        kpi_name: kpi.kpi_name,
        value: kpi.value,
        target_value: kpi.target_value,
        period_type: 'daily',
        period_date: today,
        updated_at: now.toISOString(),
      });
    }

    // Update sales KPIs - delete existing and insert new
    for (const kpi of results.sales) {
      // Delete existing record for this KPI
      await supabase
        .from('sales_kpi_metrics')
        .delete()
        .eq('kpi_name', kpi.kpi_name)
        .eq('category', kpi.category);

      // Insert new record
      await supabase.from('sales_kpi_metrics').insert({
        category: kpi.category,
        kpi_name: kpi.kpi_name,
        value: kpi.value,
        target_value: kpi.target_value,
        period_type: 'daily',
        calculated_at: now.toISOString(),
      });
    }

    // Run trend calculations
    await supabase.rpc('calculate_kpi_trends');

    console.log('[calculate-all-kpis] Completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        calculated: {
          operations: results.operations.length,
          website: results.website.length,
          sales: results.sales.length,
          total: results.operations.length + results.website.length + results.sales.length,
        },
        timestamp: now.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[calculate-all-kpis] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

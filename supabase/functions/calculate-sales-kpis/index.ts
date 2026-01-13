import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SalesKPI {
  category: string;
  kpi_name: string;
  value: number;
  previous_value?: number;
  target_value?: number;
  threshold_warning?: number;
  threshold_critical?: number;
  trend_direction?: 'up' | 'down' | 'stable';
  trend_percentage?: number;
  breakdown?: Record<string, any>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { period_type = 'daily', rep_id, company_id } = await req.json().catch(() => ({}));
    
    const now = new Date();
    const periodStart = new Date();
    const previousPeriodStart = new Date();
    
    switch (period_type) {
      case 'weekly':
        periodStart.setDate(now.getDate() - 7);
        previousPeriodStart.setDate(now.getDate() - 14);
        break;
      case 'monthly':
        periodStart.setMonth(now.getMonth() - 1);
        previousPeriodStart.setMonth(now.getMonth() - 2);
        break;
      case 'quarterly':
        periodStart.setMonth(now.getMonth() - 3);
        previousPeriodStart.setMonth(now.getMonth() - 6);
        break;
      default: // daily
        periodStart.setDate(now.getDate() - 1);
        previousPeriodStart.setDate(now.getDate() - 2);
    }

    const kpis: SalesKPI[] = [];

    // ============ CONVERSATIONAL KPIs ============
    console.log('[Sales KPIs] Calculating Conversational KPIs...');
    
    // Initial Conversations Started
    const { count: currentConvos } = await supabase
      .from('sales_conversations')
      .select('*', { count: 'exact', head: true })
      .gte('first_message_at', periodStart.toISOString())
      .lte('first_message_at', now.toISOString());
    
    const { count: prevConvos } = await supabase
      .from('sales_conversations')
      .select('*', { count: 'exact', head: true })
      .gte('first_message_at', previousPeriodStart.toISOString())
      .lt('first_message_at', periodStart.toISOString());
    
    kpis.push({
      category: 'conversational',
      kpi_name: 'initial_conversations',
      value: currentConvos || 0,
      previous_value: prevConvos || 0,
      ...calculateTrend(currentConvos || 0, prevConvos || 0),
    });

    // Qualified Conversations
    const { count: qualifiedConvos } = await supabase
      .from('sales_conversations')
      .select('*', { count: 'exact', head: true })
      .gte('qualification_date', periodStart.toISOString())
      .eq('is_qualified', true);
    
    const qualificationRate = currentConvos ? ((qualifiedConvos || 0) / currentConvos * 100) : 0;
    kpis.push({
      category: 'conversational',
      kpi_name: 'qualified_conversations',
      value: qualifiedConvos || 0,
      target_value: 20,
    });
    
    kpis.push({
      category: 'conversational',
      kpi_name: 'qualification_rate',
      value: Math.round(qualificationRate * 10) / 10,
      target_value: 30,
    });

    // Conversations with Bookings
    const { count: bookedConvos } = await supabase
      .from('sales_conversations')
      .select('*', { count: 'exact', head: true })
      .gte('first_message_at', periodStart.toISOString())
      .eq('resulted_in_booking', true);
    
    const callScheduledRate = currentConvos ? ((bookedConvos || 0) / (currentConvos || 1) * 100) : 0;
    kpis.push({
      category: 'conversational',
      kpi_name: 'call_scheduled_per_100',
      value: Math.round(callScheduledRate * 10) / 10,
      target_value: 25,
    });

    // Referral Rate
    const { count: referralConvos } = await supabase
      .from('sales_conversations')
      .select('*', { count: 'exact', head: true })
      .gte('first_message_at', periodStart.toISOString())
      .eq('referral_mentioned', true);
    
    const referralRate = currentConvos ? ((referralConvos || 0) / (currentConvos || 1) * 100) : 0;
    kpis.push({
      category: 'conversational',
      kpi_name: 'referral_rate',
      value: Math.round(referralRate * 10) / 10,
      target_value: 15,
    });

    // Channel Breakdown
    const { data: channelBreakdown } = await supabase
      .from('sales_conversations')
      .select('channel')
      .gte('first_message_at', periodStart.toISOString());
    
    const channelCounts: Record<string, number> = {};
    channelBreakdown?.forEach((c) => {
      channelCounts[c.channel] = (channelCounts[c.channel] || 0) + 1;
    });
    
    kpis.push({
      category: 'conversational',
      kpi_name: 'channel_breakdown',
      value: Object.keys(channelCounts).length,
      breakdown: channelCounts,
    });

    // ============ MEETING & CALL KPIs ============
    console.log('[Sales KPIs] Calculating Meeting KPIs...');
    
    // Discovery Calls Held
    const { count: discoveryCallsBooked } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('scheduled_start', periodStart.toISOString())
      .lte('scheduled_start', now.toISOString());
    
    const { count: discoveryCallsAttended } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('scheduled_start', periodStart.toISOString())
      .lte('scheduled_start', now.toISOString())
      .eq('attended', true);
    
    kpis.push({
      category: 'meetings',
      kpi_name: 'discovery_calls_held',
      value: discoveryCallsAttended || 0,
      target_value: 20,
    });

    // Show Rate
    const showRate = discoveryCallsBooked ? ((discoveryCallsAttended || 0) / discoveryCallsBooked * 100) : 0;
    kpis.push({
      category: 'meetings',
      kpi_name: 'show_rate',
      value: Math.round(showRate * 10) / 10,
      target_value: 80,
      threshold_warning: 70,
      threshold_critical: 60,
    });

    // No Shows
    const { count: noShows } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('scheduled_start', periodStart.toISOString())
      .lte('scheduled_start', now.toISOString())
      .eq('no_show', true);
    
    kpis.push({
      category: 'meetings',
      kpi_name: 'no_shows',
      value: noShows || 0,
    });

    // Avg Call Duration from meeting_analytics
    const { data: meetingDurations } = await supabase
      .from('meeting_analytics')
      .select('duration_minutes')
      .gte('created_at', periodStart.toISOString());
    
    const avgDuration = meetingDurations?.length 
      ? meetingDurations.reduce((sum, m) => sum + (m.duration_minutes || 0), 0) / meetingDurations.length 
      : 0;
    
    kpis.push({
      category: 'meetings',
      kpi_name: 'avg_call_duration',
      value: Math.round(avgDuration * 10) / 10,
      target_value: 30,
    });

    // Next Step Rate (calls that resulted in proposals)
    const { count: callsWithProposals } = await supabase
      .from('sales_proposals')
      .select('*', { count: 'exact', head: true })
      .gte('discovery_call_date', periodStart.toISOString())
      .not('proposal_sent_at', 'is', null);
    
    const nextStepRate = discoveryCallsAttended ? ((callsWithProposals || 0) / (discoveryCallsAttended || 1) * 100) : 0;
    kpis.push({
      category: 'meetings',
      kpi_name: 'next_step_rate',
      value: Math.round(nextStepRate * 10) / 10,
      target_value: 60,
    });

    // ============ PROPOSAL & PIPELINE KPIs ============
    console.log('[Sales KPIs] Calculating Proposal KPIs...');
    
    // Proposals Sent
    const { count: proposalsSent } = await supabase
      .from('sales_proposals')
      .select('*', { count: 'exact', head: true })
      .gte('proposal_sent_at', periodStart.toISOString())
      .not('proposal_sent_at', 'is', null);
    
    kpis.push({
      category: 'proposals',
      kpi_name: 'proposals_sent',
      value: proposalsSent || 0,
      target_value: 10,
    });

    // Proposal Close Ratio
    const { count: proposalsWon } = await supabase
      .from('sales_proposals')
      .select('*', { count: 'exact', head: true })
      .gte('accepted_at', periodStart.toISOString())
      .eq('status', 'accepted');
    
    const proposalCloseRatio = proposalsSent ? ((proposalsWon || 0) / proposalsSent * 100) : 0;
    kpis.push({
      category: 'proposals',
      kpi_name: 'proposal_close_ratio',
      value: Math.round(proposalCloseRatio * 10) / 10,
      target_value: 40,
      threshold_warning: 25,
      threshold_critical: 15,
    });

    // Avg Proposal Value
    const { data: proposalValues } = await supabase
      .from('sales_proposals')
      .select('final_value')
      .gte('proposal_sent_at', periodStart.toISOString())
      .not('final_value', 'is', null);
    
    const avgProposalValue = proposalValues?.length 
      ? proposalValues.reduce((sum, p) => sum + (p.final_value || 0), 0) / proposalValues.length 
      : 0;
    
    kpis.push({
      category: 'proposals',
      kpi_name: 'avg_proposal_value',
      value: Math.round(avgProposalValue),
      target_value: 15000,
    });

    // Total Pipeline Value
    const { data: pipelineData } = await supabase
      .from('sales_proposals')
      .select('final_value')
      .in('status', ['sent', 'viewed', 'negotiating']);
    
    const totalPipelineValue = pipelineData?.reduce((sum, p) => sum + (p.final_value || 0), 0) || 0;
    kpis.push({
      category: 'proposals',
      kpi_name: 'total_pipeline_value',
      value: totalPipelineValue,
    });

    // Scope Change Frequency
    const { count: proposalsWithRevisions } = await supabase
      .from('sales_proposals')
      .select('*', { count: 'exact', head: true })
      .gte('proposal_sent_at', periodStart.toISOString())
      .gt('revision_count', 0);
    
    const scopeChangeFreq = proposalsSent ? ((proposalsWithRevisions || 0) / (proposalsSent || 1) * 100) : 0;
    kpis.push({
      category: 'proposals',
      kpi_name: 'scope_change_frequency',
      value: Math.round(scopeChangeFreq * 10) / 10,
      target_value: 20, // lower is better
    });

    // ============ CLOSING KPIs ============
    console.log('[Sales KPIs] Calculating Closing KPIs...');
    
    // Deals Closed (Won) - from jobs with status
    const { count: dealsClosed } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .gte('updated_at', periodStart.toISOString())
      .eq('status', 'closed');
    
    const { count: prevDealsClosed } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .gte('updated_at', previousPeriodStart.toISOString())
      .lt('updated_at', periodStart.toISOString())
      .eq('status', 'closed');
    
    kpis.push({
      category: 'closing',
      kpi_name: 'deals_closed_won',
      value: dealsClosed || 0,
      previous_value: prevDealsClosed || 0,
      target_value: 5,
      ...calculateTrend(dealsClosed || 0, prevDealsClosed || 0),
    });

    // Win Rate
    const { count: totalDeals } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .gte('updated_at', periodStart.toISOString())
      .in('status', ['closed', 'archived']);
    
    const winRate = totalDeals ? ((dealsClosed || 0) / totalDeals * 100) : 0;
    kpis.push({
      category: 'closing',
      kpi_name: 'win_rate',
      value: Math.round(winRate * 10) / 10,
      target_value: 50,
    });

    // Churned Deals (Lost)
    const { count: dealsLost } = await supabase
      .from('deal_loss_reasons')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', periodStart.toISOString());
    
    kpis.push({
      category: 'closing',
      kpi_name: 'churned_deals',
      value: dealsLost || 0,
    });

    // Loss Reasons Breakdown
    const { data: lossReasons } = await supabase
      .from('deal_loss_reasons')
      .select('reason_category')
      .gte('created_at', periodStart.toISOString());
    
    const reasonCounts: Record<string, number> = {};
    lossReasons?.forEach((r) => {
      const reason = r.reason_category || 'other';
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });
    
    kpis.push({
      category: 'closing',
      kpi_name: 'loss_reasons_breakdown',
      value: Object.keys(reasonCounts).length,
      breakdown: reasonCounts,
    });

    // Revenue from placement fees
    const { data: placementFees } = await supabase
      .from('placement_fees')
      .select('fee_amount')
      .gte('created_at', periodStart.toISOString());
    
    const totalRevenue = placementFees?.reduce((sum, p) => sum + (p.fee_amount || 0), 0) || 0;
    kpis.push({
      category: 'closing',
      kpi_name: 'total_revenue',
      value: totalRevenue,
    });

    // ============ AI EFFICIENCY KPIs ============
    console.log('[Sales KPIs] Calculating AI Efficiency KPIs...');
    
    // AI Outreach Messages Sent
    const { count: aiMessagesSent } = await supabase
      .from('ai_outreach_logs')
      .select('*', { count: 'exact', head: true })
      .gte('sent_at', periodStart.toISOString());
    
    kpis.push({
      category: 'ai_efficiency',
      kpi_name: 'ai_messages_sent',
      value: aiMessagesSent || 0,
    });

    // Reply Rate to AI Messages
    const { count: aiMessagesReplied } = await supabase
      .from('ai_outreach_logs')
      .select('*', { count: 'exact', head: true })
      .gte('sent_at', periodStart.toISOString())
      .not('replied_at', 'is', null);
    
    const aiReplyRate = aiMessagesSent ? ((aiMessagesReplied || 0) / aiMessagesSent * 100) : 0;
    kpis.push({
      category: 'ai_efficiency',
      kpi_name: 'ai_reply_rate',
      value: Math.round(aiReplyRate * 10) / 10,
      target_value: 10,
      threshold_warning: 5,
    });

    // AI Draft Success Rate (unedited)
    const { count: aiUneditedDrafts } = await supabase
      .from('ai_outreach_logs')
      .select('*', { count: 'exact', head: true })
      .gte('sent_at', periodStart.toISOString())
      .eq('was_edited', false);
    
    const draftSuccessRate = aiMessagesSent ? ((aiUneditedDrafts || 0) / (aiMessagesSent || 1) * 100) : 0;
    kpis.push({
      category: 'ai_efficiency',
      kpi_name: 'ai_draft_success_rate',
      value: Math.round(draftSuccessRate * 10) / 10,
      target_value: 70,
      threshold_warning: 60,
    });

    // Calls Booked via AI
    const { count: aiBookings } = await supabase
      .from('ai_outreach_logs')
      .select('*', { count: 'exact', head: true })
      .gte('sent_at', periodStart.toISOString())
      .eq('resulted_in_booking', true);
    
    kpis.push({
      category: 'ai_efficiency',
      kpi_name: 'ai_calls_booked',
      value: aiBookings || 0,
    });

    // AI Usage from ai_usage_logs
    const { count: totalAiCalls } = await supabase
      .from('ai_usage_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', periodStart.toISOString());
    
    kpis.push({
      category: 'ai_efficiency',
      kpi_name: 'total_ai_usage',
      value: totalAiCalls || 0,
    });

    // ============ QUALITY & SENTIMENT KPIs ============
    console.log('[Sales KPIs] Calculating Quality KPIs...');
    
    // Lead Sentiment Score
    const { data: sentimentData } = await supabase
      .from('company_interactions')
      .select('sentiment_score')
      .gte('interaction_date', periodStart.toISOString())
      .not('sentiment_score', 'is', null);
    
    const avgSentiment = sentimentData?.length 
      ? sentimentData.reduce((sum, s) => sum + (s.sentiment_score || 0), 0) / sentimentData.length 
      : 0;
    
    kpis.push({
      category: 'quality',
      kpi_name: 'lead_sentiment_score',
      value: Math.round(avgSentiment * 100) / 100,
      target_value: 0.7,
    });

    // Intent Score from lead_scores
    const { data: intentData } = await supabase
      .from('lead_scores')
      .select('total_score')
      .gte('updated_at', periodStart.toISOString());
    
    const avgIntent = intentData?.length 
      ? intentData.reduce((sum, l) => sum + (l.total_score || 0), 0) / intentData.length 
      : 0;
    
    kpis.push({
      category: 'quality',
      kpi_name: 'avg_intent_score',
      value: Math.round(avgIntent),
      target_value: 70,
    });

    // Conversation Velocity (messages in last 7 days per lead)
    const { data: velocityData } = await supabase
      .from('sales_conversations')
      .select('message_count')
      .gte('last_message_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    
    const avgVelocity = velocityData?.length 
      ? velocityData.reduce((sum, c) => sum + (c.message_count || 0), 0) / velocityData.length 
      : 0;
    
    kpis.push({
      category: 'quality',
      kpi_name: 'conversation_velocity',
      value: Math.round(avgVelocity * 10) / 10,
    });

    // Post-Call Satisfaction from call_quality_feedback
    const { data: satisfactionData } = await supabase
      .from('call_quality_feedback')
      .select('rating')
      .gte('created_at', periodStart.toISOString());
    
    const avgSatisfaction = satisfactionData?.length 
      ? satisfactionData.reduce((sum, f) => sum + (f.rating || 0), 0) / satisfactionData.length 
      : 0;
    
    kpis.push({
      category: 'quality',
      kpi_name: 'post_call_satisfaction',
      value: Math.round(avgSatisfaction * 10) / 10,
      target_value: 4.5,
    });

    // ============ FORECASTING KPIs ============
    console.log('[Sales KPIs] Calculating Forecasting KPIs...');
    
    // Weighted Pipeline Value
    const { data: forecastData } = await supabase
      .from('sales_forecasts')
      .select('weighted_value, predicted_value, confidence_score')
      .eq('is_slipping', false);
    
    const weightedPipeline = forecastData?.reduce((sum, f) => sum + (f.weighted_value || 0), 0) || 0;
    kpis.push({
      category: 'forecasting',
      kpi_name: 'weighted_pipeline_value',
      value: weightedPipeline,
    });

    // Slipping Deals
    const { count: slippingDeals } = await supabase
      .from('sales_forecasts')
      .select('*', { count: 'exact', head: true })
      .eq('is_slipping', true);
    
    kpis.push({
      category: 'forecasting',
      kpi_name: 'slipping_deals',
      value: slippingDeals || 0,
      threshold_warning: 3,
      threshold_critical: 5,
    });

    // Pipeline Coverage Ratio
    const monthlyTarget = 100000; // Could be fetched from settings
    const pipelineCoverage = monthlyTarget ? (totalPipelineValue / monthlyTarget * 100) : 0;
    kpis.push({
      category: 'forecasting',
      kpi_name: 'pipeline_coverage_ratio',
      value: Math.round(pipelineCoverage * 10) / 10,
      target_value: 300, // 3x coverage is ideal
      threshold_warning: 200,
      threshold_critical: 100,
    });

    // Average Confidence Score
    const avgConfidence = forecastData?.length 
      ? forecastData.reduce((sum, f) => sum + (f.confidence_score || 0), 0) / forecastData.length 
      : 0;
    
    kpis.push({
      category: 'forecasting',
      kpi_name: 'avg_forecast_confidence',
      value: Math.round(avgConfidence),
      target_value: 75,
    });

    // Store calculated KPIs
    console.log('[Sales KPIs] Storing', kpis.length, 'KPIs...');
    
    const kpiRecords = kpis.map((kpi) => ({
      ...kpi,
      period_type,
      period_start: periodStart.toISOString().split('T')[0],
      period_end: now.toISOString().split('T')[0],
      rep_id: rep_id || null,
      company_id: company_id || null,
      calculated_at: now.toISOString(),
    }));

    // Upsert KPIs (update if exists for same period/category/kpi_name)
    for (const record of kpiRecords) {
      await supabase
        .from('sales_kpi_metrics')
        .upsert(record, {
          onConflict: 'category,kpi_name,period_type,period_start',
          ignoreDuplicates: false,
        });
    }

    console.log('[Sales KPIs] Complete');

    return new Response(
      JSON.stringify({
        success: true,
        kpis,
        period: { start: periodStart, end: now },
        calculated_at: now.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[Sales KPIs] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateTrend(current: number, previous: number): { trend_direction: 'up' | 'down' | 'stable'; trend_percentage: number } {
  if (previous === 0) {
    return { trend_direction: current > 0 ? 'up' : 'stable', trend_percentage: current > 0 ? 100 : 0 };
  }
  const change = ((current - previous) / previous) * 100;
  return {
    trend_direction: change > 2 ? 'up' : change < -2 ? 'down' : 'stable',
    trend_percentage: Math.round(Math.abs(change) * 10) / 10,
  };
}
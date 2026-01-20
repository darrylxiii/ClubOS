import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { period = 'weekly', companyId } = await req.json().catch(() => ({}));
    
    const now = new Date();
    const periodStart = new Date(now);
    const periodEnd = new Date(now);
    
    if (period === 'weekly') {
      periodStart.setDate(now.getDate() - 7);
    } else if (period === 'monthly') {
      periodStart.setMonth(now.getMonth() - 1);
    }

    const metrics: any[] = [];

    // ========================================
    // A. WORKFORCE PRODUCTIVITY
    // ========================================
    
    // Hours Worked
    const { data: timeEntries } = await supabase
      .from('time_entries')
      .select('user_id, hours_worked, billable_hours, idle_time_minutes')
      .gte('date', periodStart.toISOString().split('T')[0])
      .lte('date', periodEnd.toISOString().split('T')[0]);

    const totalHours = timeEntries?.reduce((sum, e) => sum + (e.hours_worked || 0), 0) || 0;
    const totalBillable = timeEntries?.reduce((sum, e) => sum + (e.billable_hours || 0), 0) || 0;
    const totalIdle = timeEntries?.reduce((sum, e) => sum + (e.idle_time_minutes || 0), 0) || 0;

    metrics.push({
      category: 'workforce',
      kpi_name: 'hours_worked',
      value: totalHours,
      period_type: period,
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0],
      company_id: companyId,
    });

    // Tasks Completed
    const { count: tasksCompleted } = await supabase
      .from('unified_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'done')
      .gte('completed_at', periodStart.toISOString());

    const { count: tasksAssigned } = await supabase
      .from('unified_tasks')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', periodStart.toISOString());

    const taskCompletionPct = tasksAssigned ? ((tasksCompleted || 0) / tasksAssigned) * 100 : 0;
    const tasksPerHour = totalHours > 0 ? (tasksCompleted || 0) / totalHours : 0;
    const productivityIndex = tasksPerHour * (taskCompletionPct / 100);

    metrics.push(
      { category: 'workforce', kpi_name: 'tasks_completed', value: tasksCompleted || 0, period_type: period, period_start: periodStart.toISOString().split('T')[0], period_end: periodEnd.toISOString().split('T')[0], company_id: companyId },
      { category: 'workforce', kpi_name: 'task_completion_pct', value: taskCompletionPct, period_type: period, period_start: periodStart.toISOString().split('T')[0], period_end: periodEnd.toISOString().split('T')[0], company_id: companyId },
      { category: 'workforce', kpi_name: 'tasks_per_hour', value: tasksPerHour, period_type: period, period_start: periodStart.toISOString().split('T')[0], period_end: periodEnd.toISOString().split('T')[0], company_id: companyId },
      { category: 'workforce', kpi_name: 'productivity_index', value: productivityIndex, period_type: period, period_start: periodStart.toISOString().split('T')[0], period_end: periodEnd.toISOString().split('T')[0], company_id: companyId }
    );

    // ========================================
    // B. PIPELINE DYNAMICS
    // ========================================
    
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, status, is_lost, closed_at, created_at')
      .or(`closed_at.gte.${periodStart.toISOString()},created_at.gte.${periodStart.toISOString()}`);

    const pipelinesOpen = jobs?.filter(j => j.status === 'published').length || 0;
    const pipelinesClosed = jobs?.filter(j => j.status === 'closed' && !j.is_lost).length || 0;
    const pipelinesLost = jobs?.filter(j => j.is_lost).length || 0;
    const winRate = (pipelinesClosed + pipelinesLost) > 0 
      ? (pipelinesClosed / (pipelinesClosed + pipelinesLost)) * 100 
      : 0;

    // Placement fees for revenue
    const { data: fees } = await supabase
      .from('placement_fees')
      .select('fee_amount, status')
      .gte('created_at', periodStart.toISOString());

    const amountClosed = fees?.filter(f => f.status === 'paid').reduce((sum, f) => sum + (f.fee_amount || 0), 0) || 0;
    const avgDealSize = pipelinesClosed > 0 ? amountClosed / pipelinesClosed : 0;

    metrics.push(
      { category: 'pipeline', kpi_name: 'pipelines_open', value: pipelinesOpen, period_type: period, period_start: periodStart.toISOString().split('T')[0], period_end: periodEnd.toISOString().split('T')[0], company_id: companyId },
      { category: 'pipeline', kpi_name: 'pipelines_closed', value: pipelinesClosed, period_type: period, period_start: periodStart.toISOString().split('T')[0], period_end: periodEnd.toISOString().split('T')[0], company_id: companyId },
      { category: 'pipeline', kpi_name: 'pipelines_lost', value: pipelinesLost, period_type: period, period_start: periodStart.toISOString().split('T')[0], period_end: periodEnd.toISOString().split('T')[0], company_id: companyId },
      { category: 'pipeline', kpi_name: 'pipeline_win_rate', value: winRate, period_type: period, period_start: periodStart.toISOString().split('T')[0], period_end: periodEnd.toISOString().split('T')[0], company_id: companyId },
      { category: 'pipeline', kpi_name: 'avg_deal_size', value: avgDealSize, period_type: period, period_start: periodStart.toISOString().split('T')[0], period_end: periodEnd.toISOString().split('T')[0], company_id: companyId }
    );

    // ========================================
    // C. RECRUITMENT EFFECTIVENESS
    // ========================================
    
    const { data: applications } = await supabase
      .from('applications')
      .select('id, status, created_at, applied_at')
      .gte('created_at', periodStart.toISOString());

    const shortlisted = applications?.filter(a => ['screening', 'interview', 'offer', 'hired'].includes(a.status)).length || 0;
    const offers = applications?.filter(a => ['offer', 'hired'].includes(a.status)).length || 0;
    const ctoScore = shortlisted > 0 ? (offers / shortlisted) * 100 : 0;

    // Meetings count
    const { count: candidateMeetings } = await supabase
      .from('meetings')
      .select('*', { count: 'exact', head: true })
      .eq('meeting_type', 'interview')
      .gte('scheduled_start', periodStart.toISOString());

    const { count: clientMeetings } = await supabase
      .from('meetings')
      .select('*', { count: 'exact', head: true })
      .eq('meeting_type', 'client_call')
      .gte('scheduled_start', periodStart.toISOString());

    const totalMeetings = (candidateMeetings || 0) + (clientMeetings || 0);
    const meetingToOfferRatio = totalMeetings > 0 ? (offers / totalMeetings) * 100 : 0;

    // Avg time to hire (days)
    const hiredApps = applications?.filter(a => a.status === 'hired') || [];
    const avgTimeToHire = hiredApps.length > 0
      ? hiredApps.reduce((sum, a) => {
          const start = new Date(a.applied_at);
          const end = new Date();
          return sum + Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        }, 0) / hiredApps.length
      : 0;

    const hoursPerPlacement = hiredApps.length > 0 && totalHours > 0 ? totalHours / hiredApps.length : 0;

    metrics.push(
      { category: 'recruitment', kpi_name: 'cto_score', value: ctoScore, period_type: period, period_start: periodStart.toISOString().split('T')[0], period_end: periodEnd.toISOString().split('T')[0], company_id: companyId },
      { category: 'recruitment', kpi_name: 'avg_time_to_hire', value: avgTimeToHire, period_type: period, period_start: periodStart.toISOString().split('T')[0], period_end: periodEnd.toISOString().split('T')[0], company_id: companyId },
      { category: 'recruitment', kpi_name: 'candidate_meetings', value: candidateMeetings || 0, period_type: period, period_start: periodStart.toISOString().split('T')[0], period_end: periodEnd.toISOString().split('T')[0], company_id: companyId },
      { category: 'recruitment', kpi_name: 'client_meetings', value: clientMeetings || 0, period_type: period, period_start: periodStart.toISOString().split('T')[0], period_end: periodEnd.toISOString().split('T')[0], company_id: companyId },
      { category: 'recruitment', kpi_name: 'meeting_to_offer_ratio', value: meetingToOfferRatio, period_type: period, period_start: periodStart.toISOString().split('T')[0], period_end: periodEnd.toISOString().split('T')[0], company_id: companyId },
      { category: 'recruitment', kpi_name: 'hours_per_placement', value: hoursPerPlacement, period_type: period, period_start: periodStart.toISOString().split('T')[0], period_end: periodEnd.toISOString().split('T')[0], company_id: companyId }
    );

    // ========================================
    // D. EXPERIENCE & LOYALTY
    // ========================================
    
    const { data: npsData } = await supabase
      .from('nps_surveys')
      .select('survey_type, nps_score')
      .gte('response_date', periodStart.toISOString());

    const candidateNps = npsData?.filter(n => n.survey_type === 'candidate') || [];
    const clientNps = npsData?.filter(n => n.survey_type === 'client') || [];

    const calcNps = (surveys: any[]) => {
      if (!surveys.length) return 0;
      const promoters = surveys.filter(s => s.nps_score >= 9).length;
      const detractors = surveys.filter(s => s.nps_score <= 6).length;
      return ((promoters - detractors) / surveys.length) * 100;
    };

    const { data: csatData } = await supabase
      .from('csat_surveys')
      .select('score')
      .gte('created_at', periodStart.toISOString());

    const avgCsat = csatData?.length ? csatData.reduce((sum, c) => sum + c.score, 0) / csatData.length : 0;

    // Referral rate
    const { count: totalLeads } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', periodStart.toISOString());

    const { count: referralLeads } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('application_source', 'referral')
      .gte('created_at', periodStart.toISOString());

    const referralRate = totalLeads ? ((referralLeads || 0) / totalLeads) * 100 : 0;

    metrics.push(
      { category: 'experience', kpi_name: 'nps_candidate', value: calcNps(candidateNps), period_type: period, period_start: periodStart.toISOString().split('T')[0], period_end: periodEnd.toISOString().split('T')[0], company_id: companyId },
      { category: 'experience', kpi_name: 'nps_client', value: calcNps(clientNps), period_type: period, period_start: periodStart.toISOString().split('T')[0], period_end: periodEnd.toISOString().split('T')[0], company_id: companyId },
      { category: 'experience', kpi_name: 'avg_csat', value: avgCsat, period_type: period, period_start: periodStart.toISOString().split('T')[0], period_end: periodEnd.toISOString().split('T')[0], company_id: companyId },
      { category: 'experience', kpi_name: 'referral_rate', value: referralRate, period_type: period, period_start: periodStart.toISOString().split('T')[0], period_end: periodEnd.toISOString().split('T')[0], company_id: companyId }
    );

    // ========================================
    // E. UTILISATION & CAPACITY
    // ========================================
    
    const { data: capacityData } = await supabase
      .from('capacity_planning')
      .select('scheduled_hours, available_hours, capacity_load_percent')
      .gte('week_start', periodStart.toISOString().split('T')[0]);

    const avgCapacityLoad = capacityData?.length 
      ? capacityData.reduce((sum, c) => sum + (c.capacity_load_percent || 0), 0) / capacityData.length 
      : 0;

    const idleTimePct = totalHours > 0 ? (totalIdle / 60 / totalHours) * 100 : 0;

    metrics.push(
      { category: 'utilisation', kpi_name: 'capacity_load', value: avgCapacityLoad, period_type: period, period_start: periodStart.toISOString().split('T')[0], period_end: periodEnd.toISOString().split('T')[0], company_id: companyId },
      { category: 'utilisation', kpi_name: 'idle_time_pct', value: idleTimePct, period_type: period, period_start: periodStart.toISOString().split('T')[0], period_end: periodEnd.toISOString().split('T')[0], company_id: companyId }
    );

    // ========================================
    // F. FINANCIAL TIE-INS
    // ========================================
    
    const revenuePerBillableHour = totalBillable > 0 ? amountClosed / totalBillable : 0;
    
    const { data: bonuses } = await supabase
      .from('recruiter_bonuses')
      .select('bonus_amount, revenue_contribution')
      .gte('period_start', periodStart.toISOString().split('T')[0]);

    const totalBonus = bonuses?.reduce((sum, b) => sum + (b.bonus_amount || 0), 0) || 0;
    const bonusPctOfRevenue = amountClosed > 0 ? (totalBonus / amountClosed) * 100 : 0;

    const costPerPlacement = hiredApps.length > 0 ? totalBonus / hiredApps.length : 0;

    metrics.push(
      { category: 'financial', kpi_name: 'revenue_per_billable_hour', value: revenuePerBillableHour, period_type: period, period_start: periodStart.toISOString().split('T')[0], period_end: periodEnd.toISOString().split('T')[0], company_id: companyId },
      { category: 'financial', kpi_name: 'bonus_earned', value: totalBonus, period_type: period, period_start: periodStart.toISOString().split('T')[0], period_end: periodEnd.toISOString().split('T')[0], company_id: companyId },
      { category: 'financial', kpi_name: 'bonus_pct_of_revenue', value: bonusPctOfRevenue, period_type: period, period_start: periodStart.toISOString().split('T')[0], period_end: periodEnd.toISOString().split('T')[0], company_id: companyId },
      { category: 'financial', kpi_name: 'cost_per_placement', value: costPerPlacement, period_type: period, period_start: periodStart.toISOString().split('T')[0], period_end: periodEnd.toISOString().split('T')[0], company_id: companyId }
    );

    // ========================================
    // STORE ALL METRICS
    // ========================================
    
    // Delete old metrics for this period to avoid duplicates
    await supabase
      .from('kpi_metrics')
      .delete()
      .eq('period_type', period)
      .eq('period_start', periodStart.toISOString().split('T')[0]);

    // Insert new metrics
    const { error: insertError } = await supabase
      .from('kpi_metrics')
      .insert(metrics);

    if (insertError) {
      console.error('Error inserting metrics:', insertError);
      throw insertError;
    }

    console.log(`Calculated ${metrics.length} KPI metrics for period ${period}`);

    return new Response(JSON.stringify({ 
      success: true, 
      metricsCount: metrics.length,
      period,
      periodStart: periodStart.toISOString().split('T')[0],
      periodEnd: periodEnd.toISOString().split('T')[0]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error calculating KPI metrics:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

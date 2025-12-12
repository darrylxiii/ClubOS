import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { campaign_id, calculate_all } = await req.json();

    const query = supabase.from('crm_campaigns').select('*');
    if (campaign_id && !calculate_all) {
      query.eq('id', campaign_id);
    }

    const { data: campaigns } = await query;
    const results = [];

    for (const campaign of campaigns || []) {
      // Get leads for this campaign
      const { data: prospects } = await supabase
        .from('crm_prospects')
        .select('*, crm_email_replies(count)')
        .eq('campaign_id', campaign.id);

      const totalLeads = prospects?.length || 0;
      
      // Count conversions (prospects that reached certain stages)
      const conversions = prospects?.filter(p => 
        ['qualified', 'meeting_booked', 'proposal_sent', 'negotiation', 'closed_won'].includes(p.stage)
      ).length || 0;

      const meetings = prospects?.filter(p => 
        ['meeting_booked', 'proposal_sent', 'negotiation', 'closed_won'].includes(p.stage)
      ).length || 0;

      const closedWon = prospects?.filter(p => p.stage === 'closed_won').length || 0;

      // Calculate revenue (estimate based on average deal value)
      // In production, this would come from actual deal data
      const avgDealValue = 50000; // €50k average
      const totalRevenue = closedWon * avgDealValue;

      // Estimate costs (simplified - would be more complex in production)
      const emailsSent = campaign.total_sent || 0;
      const costPerEmail = 0.01; // €0.01 per email
      const platformCost = 100; // Monthly platform cost attribution
      const totalCost = (emailsSent * costPerEmail) + platformCost;

      // Calculate metrics
      const costPerLead = totalLeads > 0 ? totalCost / totalLeads : 0;
      const costPerMeeting = meetings > 0 ? totalCost / meetings : 0;
      const costPerConversion = conversions > 0 ? totalCost / conversions : 0;
      const roiPercentage = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;

      const roiData = {
        campaign_id: campaign.id,
        total_leads: totalLeads,
        cost_per_lead: Math.round(costPerLead * 100) / 100,
        total_meetings: meetings,
        cost_per_meeting: Math.round(costPerMeeting * 100) / 100,
        total_conversions: conversions,
        cost_per_conversion: Math.round(costPerConversion * 100) / 100,
        total_revenue: totalRevenue,
        total_cost: Math.round(totalCost * 100) / 100,
        roi_percentage: Math.round(roiPercentage * 100) / 100,
        attribution_model: 'first_touch',
        calculated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('crm_campaign_roi')
        .upsert(roiData, { onConflict: 'campaign_id' })
        .select()
        .single();

      if (!error && data) {
        results.push({
          ...data,
          campaign_name: campaign.name,
        });
      }
    }

    // Generate portfolio-level summary
    const totalResults = results.reduce((acc, r) => ({
      totalLeads: acc.totalLeads + r.total_leads,
      totalMeetings: acc.totalMeetings + r.total_meetings,
      totalConversions: acc.totalConversions + r.total_conversions,
      totalRevenue: acc.totalRevenue + r.total_revenue,
      totalCost: acc.totalCost + r.total_cost,
    }), {
      totalLeads: 0,
      totalMeetings: 0,
      totalConversions: 0,
      totalRevenue: 0,
      totalCost: 0,
    });

    const portfolioROI = totalResults.totalCost > 0 
      ? ((totalResults.totalRevenue - totalResults.totalCost) / totalResults.totalCost) * 100 
      : 0;

    return new Response(JSON.stringify({ 
      success: true,
      campaigns: results,
      portfolio: {
        ...totalResults,
        roiPercentage: Math.round(portfolioROI * 100) / 100,
        avgCostPerLead: totalResults.totalLeads > 0 
          ? Math.round((totalResults.totalCost / totalResults.totalLeads) * 100) / 100 
          : 0,
        avgCostPerMeeting: totalResults.totalMeetings > 0 
          ? Math.round((totalResults.totalCost / totalResults.totalMeetings) * 100) / 100 
          : 0,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Campaign ROI calculation error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

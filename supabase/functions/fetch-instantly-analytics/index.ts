import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { listCampaigns, getAllCampaignsAnalytics, getAccount, CampaignAnalytics, mapCampaignStatus } from "../_shared/instantly-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const includeAccount = url.searchParams.get('include_account') === 'true';

    // Get account info if requested
    let accountInfo = null;
    if (includeAccount) {
      const accountResponse = await getAccount();
      if (accountResponse.data) {
        accountInfo = accountResponse.data;
      }
    }

    // Fetch all campaigns analytics in one efficient call
    const analyticsResponse = await getAllCampaignsAnalytics();
    
    if (analyticsResponse.error) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch analytics', details: analyticsResponse.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allAnalytics = analyticsResponse.data || [];
    
    // Aggregate analytics
    const aggregateAnalytics = {
      total_campaigns: allAnalytics.length,
      active_campaigns: allAnalytics.filter(a => a.campaign_status === 1 || a.campaign_status === 4).length,
      paused_campaigns: allAnalytics.filter(a => a.campaign_status === 2 || a.campaign_status === -2).length,
      completed_campaigns: allAnalytics.filter(a => a.campaign_status === 3).length,
      total_leads: 0,
      total_contacted: 0,
      total_sent: 0,
      total_opened: 0,
      total_clicked: 0,
      total_replied: 0,
      total_bounced: 0,
      total_unsubscribed: 0,
      total_opportunities: 0,
      open_rate: 0,
      click_rate: 0,
      reply_rate: 0,
      bounce_rate: 0,
      interest_rate: 0,
    };

    const campaignAnalytics = allAnalytics.map((analytics: CampaignAnalytics) => {
      const sent = analytics.emails_sent || 0;
      const opened = analytics.emails_opened || 0;
      const clicked = analytics.emails_clicked || 0;
      const replied = analytics.emails_replied || 0;
      const bounced = analytics.emails_bounced || 0;
      const contacted = analytics.contacted_count || analytics.leads_contacted || 0;
      const opportunities = analytics.total_opportunities || 0;

      // Aggregate totals
      aggregateAnalytics.total_leads += analytics.total_leads || 0;
      aggregateAnalytics.total_contacted += contacted;
      aggregateAnalytics.total_sent += sent;
      aggregateAnalytics.total_opened += opened;
      aggregateAnalytics.total_clicked += clicked;
      aggregateAnalytics.total_replied += replied;
      aggregateAnalytics.total_bounced += bounced;
      aggregateAnalytics.total_unsubscribed += analytics.emails_unsubscribed || 0;
      aggregateAnalytics.total_opportunities += opportunities;

      return {
        id: analytics.campaign_id,
        name: analytics.campaign_name,
        status: mapCampaignStatus(analytics.campaign_status),
        analytics: {
          total_leads: analytics.total_leads || 0,
          contacted_count: contacted,
          emails_sent: sent,
          emails_opened: opened,
          emails_clicked: clicked,
          emails_replied: replied,
          emails_bounced: bounced,
          emails_unsubscribed: analytics.emails_unsubscribed || 0,
          total_opportunities: opportunities,
          open_rate: sent > 0 ? (opened / sent) * 100 : 0,
          click_rate: sent > 0 ? (clicked / sent) * 100 : 0,
          reply_rate: sent > 0 ? (replied / sent) * 100 : 0,
          bounce_rate: sent > 0 ? (bounced / sent) * 100 : 0,
          interest_rate: contacted > 0 ? (opportunities / contacted) * 100 : 0,
        },
      };
    });

    // Calculate aggregate rates
    if (aggregateAnalytics.total_sent > 0) {
      aggregateAnalytics.open_rate = (aggregateAnalytics.total_opened / aggregateAnalytics.total_sent) * 100;
      aggregateAnalytics.click_rate = (aggregateAnalytics.total_clicked / aggregateAnalytics.total_sent) * 100;
      aggregateAnalytics.reply_rate = (aggregateAnalytics.total_replied / aggregateAnalytics.total_sent) * 100;
      aggregateAnalytics.bounce_rate = (aggregateAnalytics.total_bounced / aggregateAnalytics.total_sent) * 100;
    }
    if (aggregateAnalytics.total_contacted > 0) {
      aggregateAnalytics.interest_rate = (aggregateAnalytics.total_opportunities / aggregateAnalytics.total_contacted) * 100;
    }

    // Store analytics snapshot in database
    const { error: snapshotErr } = await supabase
      .from('crm_analytics_snapshots')
      .insert({
        snapshot_type: 'instantly_overview',
        data: {
          aggregate: aggregateAnalytics,
          campaigns: campaignAnalytics,
        },
        snapshot_date: new Date().toISOString().split('T')[0],
      });
    
    if (snapshotErr) {
      console.error('[fetch-instantly-analytics] Failed to store snapshot:', snapshotErr);
    }

    return new Response(
      JSON.stringify({
        aggregate: aggregateAnalytics,
        campaigns: campaignAnalytics,
        account: accountInfo,
        fetched_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[fetch-instantly-analytics] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
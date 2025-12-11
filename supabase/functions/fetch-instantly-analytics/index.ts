import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { listCampaigns, getCampaignAnalytics, getAccount } from "../_shared/instantly-client.ts";

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
    const campaignId = url.searchParams.get('campaign_id');
    const includeAccount = url.searchParams.get('include_account') === 'true';

    // Get account info if requested
    let accountInfo = null;
    if (includeAccount) {
      const accountResponse = await getAccount();
      if (accountResponse.data) {
        accountInfo = accountResponse.data;
      }
    }

    // If specific campaign requested
    if (campaignId) {
      const analyticsResponse = await getCampaignAnalytics(campaignId);
      
      if (analyticsResponse.error) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch campaign analytics', details: analyticsResponse.error }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          campaign_id: campaignId,
          analytics: analyticsResponse.data,
          account: accountInfo,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all campaigns with analytics
    const campaignsResponse = await listCampaigns({ limit: 100 });
    
    if (campaignsResponse.error) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch campaigns', details: campaignsResponse.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const campaigns = campaignsResponse.data?.items || [];
    
    // Aggregate analytics
    const aggregateAnalytics = {
      total_campaigns: campaigns.length,
      active_campaigns: campaigns.filter(c => c.status === 'active').length,
      total_leads: 0,
      total_sent: 0,
      total_opened: 0,
      total_clicked: 0,
      total_replied: 0,
      total_bounced: 0,
      total_unsubscribed: 0,
      open_rate: 0,
      click_rate: 0,
      reply_rate: 0,
      bounce_rate: 0,
    };

    const campaignAnalytics: Array<{
      id: string;
      name: string;
      status: string;
      analytics: {
        leads_count: number;
        sent: number;
        opened: number;
        clicked: number;
        replied: number;
        bounced: number;
        unsubscribed: number;
        open_rate: number;
        reply_rate: number;
      };
    }> = [];

    // Fetch analytics for each campaign
    for (const campaign of campaigns) {
      const analyticsResponse = await getCampaignAnalytics(campaign.id);
      const analytics = analyticsResponse.data;

      if (analytics) {
        const campaignData = {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          analytics: {
            leads_count: analytics.leads_count || 0,
            sent: analytics.sent || 0,
            opened: analytics.opened || 0,
            clicked: analytics.clicked || 0,
            replied: analytics.replied || 0,
            bounced: analytics.bounced || 0,
            unsubscribed: analytics.unsubscribed || 0,
            open_rate: analytics.sent > 0 ? (analytics.opened / analytics.sent) * 100 : 0,
            reply_rate: analytics.sent > 0 ? (analytics.replied / analytics.sent) * 100 : 0,
          },
        };

        campaignAnalytics.push(campaignData);

        // Aggregate
        aggregateAnalytics.total_leads += analytics.leads_count || 0;
        aggregateAnalytics.total_sent += analytics.sent || 0;
        aggregateAnalytics.total_opened += analytics.opened || 0;
        aggregateAnalytics.total_clicked += analytics.clicked || 0;
        aggregateAnalytics.total_replied += analytics.replied || 0;
        aggregateAnalytics.total_bounced += analytics.bounced || 0;
        aggregateAnalytics.total_unsubscribed += analytics.unsubscribed || 0;
      }
    }

    // Calculate aggregate rates
    if (aggregateAnalytics.total_sent > 0) {
      aggregateAnalytics.open_rate = (aggregateAnalytics.total_opened / aggregateAnalytics.total_sent) * 100;
      aggregateAnalytics.click_rate = (aggregateAnalytics.total_clicked / aggregateAnalytics.total_sent) * 100;
      aggregateAnalytics.reply_rate = (aggregateAnalytics.total_replied / aggregateAnalytics.total_sent) * 100;
      aggregateAnalytics.bounce_rate = (aggregateAnalytics.total_bounced / aggregateAnalytics.total_sent) * 100;
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

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { listCampaigns, getAllCampaignsAnalytics, mapCampaignStatus, type CampaignAnalytics } from "../_shared/instantly-client.ts";
import { publicCorsHeaders } from "../_shared/cors-config.ts";

const corsHeaders = publicCorsHeaders;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[sync-instantly-campaigns] Starting sync...');

    // Fetch all campaigns from Instantly
    const allCampaigns: Array<{ id: string; name: string; status: string | number; created_at?: string }> = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const response = await listCampaigns({
        limit: 100,
        starting_after: startingAfter,
      });

      if (response.error) {
        console.error('[sync-instantly-campaigns] Failed to fetch campaigns:', response.error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch campaigns from Instantly', details: response.error }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.data?.items) {
        allCampaigns.push(...response.data.items);
        hasMore = response.data.has_more;
        startingAfter = response.data.next_starting_after;
      } else {
        hasMore = false;
      }
    }

    console.log(`[sync-instantly-campaigns] Found ${allCampaigns.length} campaigns`);

    // Fetch ALL analytics in one efficient call
    const analyticsResponse = await getAllCampaignsAnalytics();
    const analyticsMap = new Map<string, CampaignAnalytics>();
    
    if (analyticsResponse.data && Array.isArray(analyticsResponse.data)) {
      for (const analytics of analyticsResponse.data) {
        analyticsMap.set(analytics.campaign_id, analytics);
      }
    }

    console.log(`[sync-instantly-campaigns] Fetched analytics for ${analyticsMap.size} campaigns`);

    // Sync each campaign
    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const campaign of allCampaigns) {
      try {
        const analytics = analyticsMap.get(campaign.id);
        
        // Log analytics data for debugging
        if (analytics) {
          console.log(`[sync-instantly-campaigns] Analytics for ${campaign.name}:`, {
            sent: analytics.emails_sent_count,
            opened: analytics.open_count,
            replied: analytics.reply_count,
            bounced: analytics.bounced_count,
            opportunities: analytics.total_opportunities,
            status: analytics.campaign_status
          });
        }
        
        // Map using EXACT field names from Instantly API V2
        const campaignData = {
          name: analytics?.campaign_name || campaign.name,
          external_id: campaign.id,
          source: 'instantly',
          status: analytics ? mapCampaignStatus(analytics.campaign_status) : mapCampaignStatus(campaign.status as number),
          total_sent: analytics?.emails_sent_count || 0,
          total_opened: analytics?.open_count || 0,
          total_clicked: analytics?.link_click_count || 0,
          total_replied: analytics?.reply_count || 0,
          total_bounced: analytics?.bounced_count || 0,
          total_unsubscribed: analytics?.unsubscribed_count || 0,
          total_opportunities: analytics?.total_opportunities || 0,
          contacted_count: analytics?.contacted_count || 0,
          completed_count: analytics?.completed_count || 0,
          new_leads_contacted: analytics?.new_leads_contacted_count || 0,
          leads_count: analytics?.leads_count || 0,
          last_synced_at: new Date().toISOString(),
          sync_status: 'synced',
        };

        const { data: existing } = await supabase
          .from('crm_campaigns')
          .select('id')
          .eq('external_id', campaign.id)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase.from('crm_campaigns').update(campaignData).eq('id', existing.id);
          if (error) errors.push(`Update ${campaign.name}: ${error.message}`);
          else updated++;
        } else {
          const { error } = await supabase.from('crm_campaigns').insert(campaignData);
          if (error) errors.push(`Insert ${campaign.name}: ${error.message}`);
          else created++;
        }
      } catch (err) {
        errors.push(`${campaign.id}: ${String(err)}`);
      }
    }

    // Log sync
    await supabase.from('crm_sync_logs').insert({
      sync_type: 'instantly_campaigns',
      synced_records: created + updated,
      failed_records: errors.length,
      errors: errors.length > 0 ? errors : null,
    });

    console.log(`[sync-instantly-campaigns] Complete: ${created} created, ${updated} updated, ${errors.length} errors`);

    return new Response(
      JSON.stringify({ success: true, total: allCampaigns.length, created, updated, errors: errors.length > 0 ? errors.slice(0, 5) : undefined }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[sync-instantly-campaigns] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { listCampaigns, getCampaignAnalytics, type InstantlyCampaign } from "../_shared/instantly-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Optional: Get user context for manual triggers
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    console.log('[sync-instantly-campaigns] Starting sync...');

    // Fetch all campaigns from Instantly
    const allCampaigns: InstantlyCampaign[] = [];
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

    console.log(`[sync-instantly-campaigns] Found ${allCampaigns.length} campaigns in Instantly`);

    // Sync each campaign
    let synced = 0;
    let created = 0;
    let updated = 0;
    const errors: { campaign_id: string; error: string }[] = [];

    for (const campaign of allCampaigns) {
      try {
        // Fetch analytics for the campaign
        const analyticsResponse = await getCampaignAnalytics(campaign.id);
        const analytics = analyticsResponse.data;

        // Check if campaign exists in CRM
        const { data: existing } = await supabase
          .from('crm_campaigns')
          .select('id')
          .eq('external_id', campaign.id)
          .maybeSingle();

        // Map Instantly status to CRM status
        const statusMap: Record<string, string> = {
          'active': 'active',
          'paused': 'paused',
          'completed': 'completed',
          'draft': 'draft',
        };

        const campaignData = {
          name: campaign.name,
          external_id: campaign.id,
          source: 'instantly',
          status: statusMap[campaign.status] || 'active',
          total_sent: analytics?.sent || campaign.sent_count || 0,
          total_opened: analytics?.opened || campaign.open_count || 0,
          total_clicked: analytics?.clicked || campaign.click_count || 0,
          total_replied: analytics?.replied || campaign.reply_count || 0,
          total_bounced: analytics?.bounced || campaign.bounce_count || 0,
          total_unsubscribed: analytics?.unsubscribed || campaign.unsubscribe_count || 0,
          leads_count: analytics?.leads_count || campaign.leads_count || 0,
          last_synced_at: new Date().toISOString(),
          sync_status: 'synced',
          updated_at: new Date().toISOString(),
        };

        if (existing) {
          // Update existing campaign
          const { error: updateError } = await supabase
            .from('crm_campaigns')
            .update(campaignData)
            .eq('id', existing.id);

          if (updateError) {
            errors.push({ campaign_id: campaign.id, error: updateError.message });
          } else {
            updated++;
          }
        } else {
          // Create new campaign
          const { error: insertError } = await supabase
            .from('crm_campaigns')
            .insert({
              ...campaignData,
              created_at: campaign.created_at || new Date().toISOString(),
            });

          if (insertError) {
            errors.push({ campaign_id: campaign.id, error: insertError.message });
          } else {
            created++;
          }
        }

        synced++;
      } catch (err) {
        errors.push({ campaign_id: campaign.id, error: String(err) });
      }
    }

    // Log sync activity
    const { error: logError } = await supabase
      .from('crm_sync_logs')
      .insert({
        sync_type: 'campaigns',
        source: 'instantly',
        total_records: allCampaigns.length,
        synced_records: synced,
        created_records: created,
        updated_records: updated,
        failed_records: errors.length,
        errors: errors.length > 0 ? errors : null,
        triggered_by: userId,
        completed_at: new Date().toISOString(),
      });
    
    if (logError) {
      console.error('[sync-instantly-campaigns] Failed to log sync:', logError);
    }

    console.log(`[sync-instantly-campaigns] Sync complete: ${synced} synced, ${created} created, ${updated} updated, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          total: allCampaigns.length,
          synced,
          created,
          updated,
          errors: errors.length,
        },
        errors: errors.slice(0, 10),
      }),
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

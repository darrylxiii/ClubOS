import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCampaignSequenceSteps } from "../_shared/instantly-client.ts";

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

    console.log('[sync-instantly-sequence-steps] Starting sync...');

    // Get request body for optional campaign filter
    let campaignId: string | undefined;
    try {
      const body = await req.json();
      campaignId = body?.campaignId;
    } catch {
      // No body or invalid JSON - sync all campaigns
    }

    // Fetch campaigns from database
    let campaignsQuery = supabase
      .from('crm_campaigns')
      .select('id, external_id, name')
      .not('external_id', 'is', null);

    if (campaignId) {
      campaignsQuery = campaignsQuery.eq('external_id', campaignId);
    }

    const { data: campaigns, error: campaignsError } = await campaignsQuery;

    if (campaignsError) {
      console.error('[sync-instantly-sequence-steps] Failed to fetch campaigns:', campaignsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch campaigns', details: campaignsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!campaigns || campaigns.length === 0) {
      console.log('[sync-instantly-sequence-steps] No campaigns found to sync');
      return new Response(
        JSON.stringify({ success: true, message: 'No campaigns to sync', synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[sync-instantly-sequence-steps] Syncing steps for ${campaigns.length} campaigns`);

    let totalSynced = 0;
    const errors: string[] = [];

    for (const campaign of campaigns) {
      if (!campaign.external_id) continue;

      try {
        console.log(`[sync-instantly-sequence-steps] Fetching steps for campaign: ${campaign.name} (${campaign.external_id})`);
        
        const response = await getCampaignSequenceSteps(campaign.external_id);

        if (response.error) {
          console.error(`[sync-instantly-sequence-steps] Error for ${campaign.name}:`, response.error);
          errors.push(`${campaign.name}: ${response.error}`);
          continue;
        }

        if (!response.data?.steps || response.data.steps.length === 0) {
          console.log(`[sync-instantly-sequence-steps] No steps found for campaign: ${campaign.name}`);
          continue;
        }

        console.log(`[sync-instantly-sequence-steps] Found ${response.data.steps.length} steps for ${campaign.name}`);

        // Upsert each step
        for (const step of response.data.steps) {
          const stepData = {
            campaign_id: campaign.id,
            external_campaign_id: campaign.external_id,
            step_number: step.step_number,
            variant_id: step.variant_id || null,
            variant_label: step.variant_label || null,
            subject_line: step.subject_line || null,
            sent_count: step.sent_count || 0,
            open_count: step.open_count || 0,
            reply_count: step.reply_count || 0,
            click_count: step.click_count || 0,
            bounce_count: step.bounce_count || 0,
            open_rate: step.sent_count > 0 ? ((step.open_count || 0) / step.sent_count) * 100 : 0,
            reply_rate: step.sent_count > 0 ? ((step.reply_count || 0) / step.sent_count) * 100 : 0,
            click_rate: step.sent_count > 0 ? ((step.click_count || 0) / step.sent_count) * 100 : 0,
            synced_at: new Date().toISOString(),
          };

          const { error: upsertError } = await supabase
            .from('instantly_sequence_steps')
            .upsert(stepData, {
              onConflict: 'external_campaign_id,step_number,variant_id',
            });

          if (upsertError) {
            console.error(`[sync-instantly-sequence-steps] Error upserting step:`, upsertError);
            errors.push(`${campaign.name} step ${step.step_number}: ${upsertError.message}`);
          } else {
            totalSynced++;
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`[sync-instantly-sequence-steps] Exception for ${campaign.name}:`, errorMessage);
        errors.push(`${campaign.name}: ${errorMessage}`);
      }
    }

    // Log sync
    await supabase.from('crm_sync_logs').insert({
      sync_type: 'instantly_sequence_steps',
      synced_records: totalSynced,
      failed_records: errors.length,
      errors: errors.length > 0 ? errors : null,
    });

    console.log(`[sync-instantly-sequence-steps] Complete: ${totalSynced} steps synced, ${errors.length} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced: totalSynced, 
        errors: errors.length > 0 ? errors.slice(0, 5) : undefined 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[sync-instantly-sequence-steps] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

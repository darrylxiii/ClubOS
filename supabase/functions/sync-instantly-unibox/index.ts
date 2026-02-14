import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { listUniboxEmails } from "../_shared/instantly-client.ts";
import type { UniboxEmail } from "../_shared/instantly-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function classifyByInterest(aiInterestValue?: number): string {
  if (aiInterestValue === undefined || aiInterestValue === null) return 'unclassified';
  if (aiInterestValue >= 0.8) return 'hot_lead';
  if (aiInterestValue >= 0.5) return 'interested';
  if (aiInterestValue >= 0.3) return 'question';
  return 'unclassified';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('[sync-unibox] Starting Unibox email sync...');

    // Fetch all existing external_ids for dedup
    const { data: existingIds } = await supabase
      .from('crm_email_replies')
      .select('external_id')
      .not('external_id', 'is', null);

    const existingSet = new Set((existingIds || []).map((r: { external_id: string }) => r.external_id));

    // Pre-fetch prospect and campaign lookup maps
    const { data: prospects } = await supabase
      .from('crm_prospects')
      .select('id, email');

    const prospectMap = new Map<string, string>();
    (prospects || []).forEach((p: { id: string; email: string }) => {
      if (p.email) prospectMap.set(p.email.toLowerCase(), p.id);
    });

    const { data: campaigns } = await supabase
      .from('crm_campaigns')
      .select('id, external_id');

    const campaignMap = new Map<string, string>();
    (campaigns || []).forEach((c: { id: string; external_id: string }) => {
      if (c.external_id) campaignMap.set(c.external_id, c.id);
    });

    let cursor: string | undefined;
    let totalInserted = 0;
    let totalSkipped = 0;
    let totalPages = 0;

    // Paginate through all received emails
    do {
      const response = await listUniboxEmails({
        email_type: 'received',
        preview_only: false,
        limit: 50,
        starting_after: cursor,
      });

      if (response.error || !response.data) {
        console.error('[sync-unibox] API error:', response.error);
        break;
      }

      const emails = response.data.items || [];
      totalPages++;
      console.log(`[sync-unibox] Page ${totalPages}: ${emails.length} emails`);

      if (emails.length === 0) break;

      const toInsert: Record<string, unknown>[] = [];

      for (const email of emails) {
        // Skip if already synced
        if (existingSet.has(email.id)) {
          totalSkipped++;
          continue;
        }

        const fromEmail = email.from_address_email?.toLowerCase();
        if (!fromEmail) continue;

        // Find matching prospect
        const prospectId = prospectMap.get(fromEmail);
        if (!prospectId) {
          totalSkipped++;
          continue;
        }

        // Find matching campaign
        const crmCampaignId = email.campaign_id ? campaignMap.get(email.campaign_id) : null;

        const classification = classifyByInterest(email.ai_interest_value);

        toInsert.push({
          prospect_id: prospectId,
          campaign_id: crmCampaignId,
          from_email: fromEmail,
          from_name: email.from_address_json?.name || null,
          to_email: email.to_address_email_list?.[0] || null,
          subject: email.subject || null,
          body_text: email.body?.text || null,
          body_html: email.body?.html || null,
          body_preview: email.content_preview || null,
          message_id: email.message_id || null,
          thread_id: email.thread_id || null,
          in_reply_to: email.in_reply_to || null,
          external_id: email.id,
          classification,
          sentiment_score: email.ai_interest_value || 0,
          is_read: !(email.is_unread ?? true),
          received_at: email.timestamp_email || email.timestamp_created || new Date().toISOString(),
          metadata: {
            ue_type: email.ue_type,
            eaccount: email.eaccount,
            campaign_id_instantly: email.campaign_id,
          },
        });

        existingSet.add(email.id);
      }

      // Batch insert
      if (toInsert.length > 0) {
        const { error: insertErr } = await supabase
          .from('crm_email_replies')
          .upsert(toInsert, { onConflict: 'external_id', ignoreDuplicates: true });

        if (insertErr) {
          console.error('[sync-unibox] Insert error:', insertErr);
        } else {
          totalInserted += toInsert.length;
        }
      }

      cursor = response.data.next_starting_after;
    } while (cursor);

    // Log sync stats
    await supabase
      .from('crm_sync_logs')
      .insert({
        sync_type: 'unibox_sync',
        status: 'completed',
        records_synced: totalInserted,
        records_skipped: totalSkipped,
        details: { pages: totalPages },
      });

    console.log(`[sync-unibox] Done: ${totalInserted} inserted, ${totalSkipped} skipped, ${totalPages} pages`);

    return new Response(
      JSON.stringify({
        success: true,
        inserted: totalInserted,
        skipped: totalSkipped,
        pages: totalPages,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[sync-unibox] Error:', error);

    await supabase
      .from('crm_sync_logs')
      .insert({
        sync_type: 'unibox_sync',
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });

    return new Response(
      JSON.stringify({ error: 'Sync failed', details: error instanceof Error ? error.message : 'Unknown' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { listLeads, createLead, type InstantlyLead } from "../_shared/instantly-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map Instantly lead status to CRM stage
function mapInstantlyStatusToStage(lead: InstantlyLead): string {
  if (lead.is_bounced) return 'closed_lost';
  if (lead.is_unsubscribed) return 'unsubscribed';
  
  const status = lead.lead_status?.toLowerCase() || lead.status?.toLowerCase();
  
  switch (status) {
    case 'interested':
      return 'qualified';
    case 'meeting_booked':
    case 'meeting booked':
      return 'meeting_booked';
    case 'meeting_completed':
    case 'meeting completed':
      return 'demo_completed';
    case 'not_interested':
    case 'not interested':
      return 'closed_lost';
    case 'wrong_person':
    case 'wrong person':
      return 'closed_lost';
    case 'out_of_office':
    case 'out of office':
      return 'contacted'; // Keep in pipeline
    default:
      // Engagement-based fallback
      if (lead.reply_count && lead.reply_count > 0) return 'replied';
      if (lead.open_count && lead.open_count > 0) return 'opened';
      if (lead.sent_count && lead.sent_count > 0) return 'contacted';
      return 'new';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body for optional filters
    const body = await req.json().catch(() => ({}));
    const { campaign_id, direction = 'both' } = body;

    // Optional: Get user context
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    console.log(`[sync-instantly-leads] Starting sync (direction: ${direction}, campaign: ${campaign_id || 'all'})`);

    let instantlyImported = 0;
    let instantlyUpdated = 0;
    let crmPushed = 0;
    const errors: { email?: string; error: string }[] = [];

    // =========================================
    // DIRECTION 1: Instantly → CRM
    // =========================================
    if (direction === 'both' || direction === 'instantly_to_crm') {
      console.log('[sync-instantly-leads] Syncing Instantly → CRM...');

      // Get campaigns to sync
      let campaignIds: string[] = [];
      if (campaign_id) {
        campaignIds = [campaign_id];
      } else {
        // Get all Instantly campaigns from CRM
        const { data: campaigns } = await supabase
          .from('crm_campaigns')
          .select('external_id')
          .eq('source', 'instantly')
          .not('external_id', 'is', null);
        
        campaignIds = campaigns?.map(c => c.external_id).filter(Boolean) || [];
      }

      for (const instantlyCampaignId of campaignIds) {
        // Fetch all leads from Instantly for this campaign
        let hasMore = true;
        let startingAfter: string | undefined;

        while (hasMore) {
          const response = await listLeads({
            campaign_id: instantlyCampaignId,
            limit: 100,
            starting_after: startingAfter,
          });

          if (response.error) {
            errors.push({ error: `Failed to fetch leads for campaign ${instantlyCampaignId}: ${response.error}` });
            break;
          }

          const leads = response.data?.items || [];
          hasMore = response.data?.has_more || false;
          startingAfter = response.data?.next_starting_after;

          // Get CRM campaign ID
          const { data: crmCampaign } = await supabase
            .from('crm_campaigns')
            .select('id')
            .eq('external_id', instantlyCampaignId)
            .maybeSingle();

          for (const lead of leads) {
            try {
              const email = lead.email.toLowerCase().trim();
              const stage = mapInstantlyStatusToStage(lead);
              const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || email.split('@')[0];

              // Check if prospect exists
              const { data: existing } = await supabase
                .from('crm_prospects')
                .select('id, instantly_lead_id')
                .eq('email', email)
                .maybeSingle();

              const prospectData = {
                first_name: lead.first_name,
                last_name: lead.last_name,
                full_name: fullName,
                company_name: lead.company_name,
                company_domain: lead.website || email.split('@')[1],
                phone: lead.phone,
                stage,
                emails_sent: lead.sent_count || 0,
                emails_opened: lead.open_count || 0,
                emails_clicked: lead.click_count || 0,
                emails_replied: lead.reply_count || 0,
                email_status: lead.is_bounced ? 'bounced' : 'valid',
                instantly_lead_id: lead.id,
                last_contacted_at: lead.last_contacted_at,
                updated_at: new Date().toISOString(),
              };

              if (existing) {
                // Update existing prospect
                const { error: updateError } = await supabase
                  .from('crm_prospects')
                  .update(prospectData)
                  .eq('id', existing.id);

                if (updateError) {
                  errors.push({ email, error: updateError.message });
                } else {
                  instantlyUpdated++;
                }
              } else {
                // Create new prospect
                const { error: insertError } = await supabase
                  .from('crm_prospects')
                  .insert({
                    email,
                    ...prospectData,
                    source: 'instantly',
                    campaign_id: crmCampaign?.id,
                    custom_fields: lead.custom_variables || {},
                  });

                if (insertError) {
                  errors.push({ email, error: insertError.message });
                } else {
                  instantlyImported++;
                }
              }
            } catch (err) {
              errors.push({ email: lead.email, error: String(err) });
            }
          }
        }
      }
    }

    // =========================================
    // DIRECTION 2: CRM → Instantly
    // =========================================
    if (direction === 'both' || direction === 'crm_to_instantly') {
      console.log('[sync-instantly-leads] Syncing CRM → Instantly...');

      // Get prospects that should be pushed to Instantly
      // Only push prospects from Instantly campaigns that don't have an instantly_lead_id
      const { data: prospectsToPush } = await supabase
        .from('crm_prospects')
        .select(`
          id, email, first_name, last_name, company_name, phone, company_domain, custom_fields,
          campaign:crm_campaigns!inner(id, external_id, source)
        `)
        .is('instantly_lead_id', null)
        .eq('campaign.source', 'instantly')
        .not('campaign.external_id', 'is', null)
        .limit(500);

      if (prospectsToPush && prospectsToPush.length > 0) {
        for (const prospect of prospectsToPush) {
          try {
            // Handle campaign as array from inner join
            const campaignData = prospect.campaign as unknown as Array<{ external_id: string }>;
            const externalId = Array.isArray(campaignData) ? campaignData[0]?.external_id : null;
            if (!externalId) continue;

            const response = await createLead({
              campaign_id: externalId,
              email: prospect.email,
              first_name: prospect.first_name || undefined,
              last_name: prospect.last_name || undefined,
              company_name: prospect.company_name || undefined,
              phone: prospect.phone || undefined,
              website: prospect.company_domain || undefined,
              custom_variables: prospect.custom_fields as Record<string, string> || undefined,
            });

            if (response.error) {
              errors.push({ email: prospect.email, error: response.error });
            } else if (response.data) {
              // Update CRM with Instantly lead ID
              await supabase
                .from('crm_prospects')
                .update({ 
                  instantly_lead_id: response.data.id,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', prospect.id);
              
              crmPushed++;
            }
          } catch (err) {
            errors.push({ email: prospect.email, error: String(err) });
          }
        }
      }
    }

    // Log sync activity
    const { error: logError } = await supabase
      .from('crm_sync_logs')
      .insert({
        sync_type: 'leads',
        source: 'instantly',
        direction,
        total_records: instantlyImported + instantlyUpdated + crmPushed,
        synced_records: instantlyImported + instantlyUpdated + crmPushed,
        created_records: instantlyImported,
        updated_records: instantlyUpdated,
        pushed_records: crmPushed,
        failed_records: errors.length,
        errors: errors.length > 0 ? errors : null,
        triggered_by: userId,
        completed_at: new Date().toISOString(),
      });
    
    if (logError) {
      console.error('[sync-instantly-leads] Failed to log sync:', logError);
    }

    console.log(`[sync-instantly-leads] Sync complete: ${instantlyImported} imported, ${instantlyUpdated} updated, ${crmPushed} pushed, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          instantly_imported: instantlyImported,
          instantly_updated: instantlyUpdated,
          crm_pushed: crmPushed,
          errors: errors.length,
        },
        errors: errors.slice(0, 20),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[sync-instantly-leads] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

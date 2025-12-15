import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  listLeads,
  createLead,
  type InstantlyLead,
  LEAD_INTEREST_STATUS,
  LEAD_STATUS,
} from "../_shared/instantly-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map Instantly V2 lead to CRM stage using numeric status codes
function mapInstantlyStatusToStage(lead: InstantlyLead): string {
  // Check interest status first (V2 API uses lt_interest_status)
  if (lead.lt_interest_status !== undefined) {
    switch (lead.lt_interest_status) {
      case LEAD_INTEREST_STATUS.INTERESTED:
        return 'qualified';
      case LEAD_INTEREST_STATUS.MEETING_BOOKED:
        return 'meeting_booked';
      case LEAD_INTEREST_STATUS.MEETING_COMPLETED:
        return 'demo_completed';
      case LEAD_INTEREST_STATUS.NOT_INTERESTED:
        return 'closed_lost';
      case LEAD_INTEREST_STATUS.WRONG_PERSON:
        return 'closed_lost';
      case LEAD_INTEREST_STATUS.OUT_OF_OFFICE:
        return 'contacted'; // Keep in pipeline for follow-up
    }
  }

  // Check lead status (V2 API uses numeric status)
  if (lead.status === LEAD_STATUS.BOUNCED) return 'closed_lost';
  if (lead.status === LEAD_STATUS.UNSUBSCRIBED) return 'unsubscribed';

  // Engagement-based fallback using V2 field names
  if (lead.email_reply_count > 0) return 'replied';
  if (lead.email_open_count > 0) return 'opened';
  return 'contacted';
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
          hasMore = !!response.data?.next_starting_after;
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
                .select('id, instantly_lead_id, stage, deal_value, close_probability, currency, owner_id')
                .eq('email', email)
                .maybeSingle();

              const prospectData = {
                first_name: lead.first_name || null,
                last_name: lead.last_name || null,
                full_name: fullName,
                company_name: lead.company_name || null,
                company_domain: lead.company_domain || lead.website || email.split('@')[1],
                phone: lead.phone || null,
                stage,
                emails_opened: lead.email_open_count || 0,
                emails_clicked: lead.email_click_count || 0,
                emails_replied: lead.email_reply_count || 0,
                email_status: lead.status === LEAD_STATUS.BOUNCED ? 'bounced' : 'valid',
                instantly_lead_id: lead.id,
                last_contacted_at: lead.timestamp_last_contact || null,
                is_interested: (lead.lt_interest_status || 0) > 0,
                interest_indicated_at: lead.timestamp_last_interest_change || null,
                updated_at: new Date().toISOString(),
              };

              // Auto-Deal Logic: If qualified (Interested), ensure it has deal attributes
              if (stage === 'qualified') {
                // Default deal values for "Interested" leads
                (prospectData as any).deal_value = (existing as any)?.deal_value || 5000;
                (prospectData as any).close_probability = (existing as any)?.close_probability || 20;
                (prospectData as any).currency = (existing as any)?.currency || 'USD';
              }

              if (existing) {
                // Check for transition to qualified to trigger task
                const isTransitioningToQualified = stage === 'qualified' && (existing as any).stage !== 'qualified';

                // Update existing prospect
                const { error: updateError } = await supabase
                  .from('crm_prospects')
                  .update(prospectData)
                  .eq('id', existing.id);

                if (updateError) {
                  errors.push({ email, error: updateError.message });
                } else {
                  instantlyUpdated++;

                  // Create Task if transitioning (AUTO-TASK)
                  if (isTransitioningToQualified) {
                    await supabase.from('crm_activities').insert({
                      prospect_id: existing.id,
                      activity_type: 'task',
                      subject: '🔥 HOT LEAD: Follow up immediately',
                      description: `Lead marked as ${stage} in Instantly. Reply count: ${lead.email_reply_count}`,
                      priority: 1, // High priority
                      due_date: new Date().toISOString().split('T')[0], // Due today
                      owner_id: (existing as any).owner_id // Assign to prospect owner
                    });
                  }
                }
              } else {
                // Create new prospect
                const { data: newProspect, error: insertError } = await supabase
                  .from('crm_prospects')
                  .insert({
                    email,
                    ...prospectData,
                    source: 'instantly',
                    campaign_id: crmCampaign?.id,
                    custom_fields: lead.payload || {},
                  })
                  .select('id, owner_id') // Select ID for task creation
                  .single();

                if (insertError) {
                  errors.push({ email, error: insertError.message });
                } else {
                  instantlyImported++;

                  // Create Task if born qualified (AUTO-TASK)
                  if (stage === 'qualified' && newProspect) {
                    await supabase.from('crm_activities').insert({
                      prospect_id: newProspect.id,
                      activity_type: 'task',
                      subject: '🔥 HOT LEAD: Follow up immediately',
                      description: `Lead imported as ${stage} from Instantly. Reply count: ${lead.email_reply_count}`,
                      priority: 1,
                      due_date: new Date().toISOString().split('T')[0],
                      owner_id: newProspect.owner_id
                    });
                  }
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

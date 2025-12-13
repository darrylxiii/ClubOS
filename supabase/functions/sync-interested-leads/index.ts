import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  listInterestedLeads, 
  listMeetingBookedLeads,
  listRepliedLeads,
  type InstantlyLead,
  LEAD_INTEREST_STATUS,
  LEAD_STATUS,
} from "../_shared/instantly-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Maps Instantly V2 lead to CRM stage based on interest status
 */
function mapLeadToStage(lead: InstantlyLead): string {
  // Check interest status first (most important for CRM)
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
        return 'contacted'; // Keep in pipeline, follow up later
    }
  }

  // Check lead status
  if (lead.status === LEAD_STATUS.BOUNCED) return 'closed_lost';
  if (lead.status === LEAD_STATUS.UNSUBSCRIBED) return 'unsubscribed';

  // Engagement-based fallback
  if (lead.email_reply_count > 0) return 'replied';
  if (lead.email_open_count > 0) return 'opened';
  return 'contacted';
}

/**
 * Determines if a lead is "hot" and should be in CRM
 */
function isHotLead(lead: InstantlyLead): boolean {
  // Interested or meeting booked/completed
  if (lead.lt_interest_status && lead.lt_interest_status > 0) {
    return true;
  }
  // Has replied (even without interest status set)
  if (lead.email_reply_count > 0) {
    return true;
  }
  return false;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const { campaign_id } = body;

    console.log('[sync-interested-leads] Starting sync of interested/replied leads...');

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors: { email?: string; error: string }[] = [];

    // Get all Instantly campaigns from our database
    let campaignIds: string[] = [];
    if (campaign_id) {
      campaignIds = [campaign_id];
    } else {
      const { data: campaigns } = await supabase
        .from('crm_campaigns')
        .select('external_id')
        .eq('source', 'instantly')
        .not('external_id', 'is', null);
      
      campaignIds = campaigns?.map(c => c.external_id).filter(Boolean) || [];
    }

    console.log(`[sync-interested-leads] Processing ${campaignIds.length} campaigns`);

    // Fetch leads from three key filters: Interested, Meeting Booked, Replied
    for (const instantlyCampaignId of campaignIds) {
      // Get CRM campaign ID for linking
      const { data: crmCampaign } = await supabase
        .from('crm_campaigns')
        .select('id, name')
        .eq('external_id', instantlyCampaignId)
        .maybeSingle();

      console.log(`[sync-interested-leads] Campaign ${instantlyCampaignId} → CRM ID: ${crmCampaign?.id}`);

      // Fetch interested leads
      const interestedResponse = await listInterestedLeads(instantlyCampaignId, 100);
      const meetingBookedResponse = await listMeetingBookedLeads(instantlyCampaignId, 100);
      const repliedResponse = await listRepliedLeads(instantlyCampaignId, 100);

      // Combine all leads and deduplicate by email
      const allLeads = new Map<string, InstantlyLead>();
      
      const addLeads = (leads: InstantlyLead[] | undefined) => {
        if (!leads) return;
        for (const lead of leads) {
          const email = lead.email.toLowerCase().trim();
          // Keep the one with higher interest status
          const existing = allLeads.get(email);
          if (!existing || (lead.lt_interest_status || 0) > (existing.lt_interest_status || 0)) {
            allLeads.set(email, lead);
          }
        }
      };

      addLeads(interestedResponse.data?.items);
      addLeads(meetingBookedResponse.data?.items);
      addLeads(repliedResponse.data?.items);

      console.log(`[sync-interested-leads] Found ${allLeads.size} unique hot leads for campaign ${instantlyCampaignId}`);

      // Process each lead
      for (const [email, lead] of allLeads) {
        try {
          if (!isHotLead(lead)) {
            skipped++;
            continue;
          }

          const stage = mapLeadToStage(lead);
          const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || email.split('@')[0];
          const companyDomain = lead.company_domain || lead.website || email.split('@')[1];

          // Check if prospect exists
          const { data: existing } = await supabase
            .from('crm_prospects')
            .select('id, stage, instantly_lead_id')
            .eq('email', email)
            .maybeSingle();

          const prospectData = {
            first_name: lead.first_name || null,
            last_name: lead.last_name || null,
            full_name: fullName,
            company_name: lead.company_name || null,
            company_domain: companyDomain,
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

          if (existing) {
            // Update existing prospect
            const { error: updateError } = await supabase
              .from('crm_prospects')
              .update(prospectData)
              .eq('id', existing.id);

            if (updateError) {
              errors.push({ email, error: updateError.message });
            } else {
              updated++;
              console.log(`[sync-interested-leads] Updated: ${email} → ${stage}`);
            }
          } else {
            // Create new prospect
            const { error: insertError } = await supabase
              .from('crm_prospects')
              .insert({
                email,
                ...prospectData,
                source: 'instantly',
                campaign_id: crmCampaign?.id || null,
                custom_fields: lead.payload || {},
              });

            if (insertError) {
              errors.push({ email, error: insertError.message });
            } else {
              imported++;
              console.log(`[sync-interested-leads] Imported: ${email} → ${stage}`);

              // Create Club Pilot task for follow-up
              try {
                await supabase.from('pilot_tasks').insert({
                  title: `Follow up with ${fullName}`,
                  description: `Interested lead from Instantly campaign: ${crmCampaign?.name || 'Unknown'}. They showed interest - reach out to schedule a call.`,
                  task_type: 'follow_up',
                  priority: 'high',
                  status: 'pending',
                  due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
                  metadata: {
                    source: 'instantly_sync',
                    prospect_email: email,
                    campaign_id: crmCampaign?.id,
                    interest_status: lead.lt_interest_status,
                  },
                });
              } catch (taskErr) {
                console.warn(`[sync-interested-leads] Failed to create task for ${email}:`, taskErr);
              }
            }
          }
        } catch (err) {
          errors.push({ email, error: String(err) });
        }
      }
    }

    // Log sync activity
    await supabase.from('crm_sync_logs').insert({
      sync_type: 'interested_leads',
      source: 'instantly',
      direction: 'instantly_to_crm',
      total_records: imported + updated + skipped,
      synced_records: imported + updated,
      created_records: imported,
      updated_records: updated,
      failed_records: errors.length,
      errors: errors.length > 0 ? errors : null,
      completed_at: new Date().toISOString(),
    });

    console.log(`[sync-interested-leads] Complete: ${imported} imported, ${updated} updated, ${skipped} skipped, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          imported,
          updated,
          skipped,
          errors: errors.length,
        },
        errors: errors.slice(0, 20),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[sync-interested-leads] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

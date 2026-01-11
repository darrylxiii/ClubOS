import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  listLeads,
  createLead,
  type InstantlyLead,
  LEAD_INTEREST_STATUS,
  LEAD_STATUS,
  LEAD_FILTERS,
} from "../_shared/instantly-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =====================================================
// STAGE RANK SYSTEM - Prevents accidental downgrades
// =====================================================

// Canonical stage order (higher = more advanced)
const STAGE_RANK: Record<string, number> = {
  'contacted': 1,
  'opened': 2,
  'replied': 3,
  'qualified': 4,
  'meeting_booked': 5,
  'demo_completed': 6,
  'proposal_sent': 7,
  'negotiation': 8,
  'closed_won': 9,
  // Terminal stages - special handling
  'closed_lost': -1,
  'unsubscribed': -2,
};

// Terminal stages that should always override (negative outcomes)
const TERMINAL_STAGES = new Set(['closed_lost', 'unsubscribed']);

// Check if a stage is terminal (bounce, unsub, not interested)
function isTerminalStage(stage: string): boolean {
  return TERMINAL_STAGES.has(stage);
}

// Get stage rank (returns 0 for unknown stages)
function getStageRank(stage: string): number {
  return STAGE_RANK[stage] || 0;
}

// Determine final stage: never downgrade unless terminal
function computeFinalStage(existingStage: string | null, newStage: string): string {
  // If no existing stage, use new
  if (!existingStage) return newStage;

  // Terminal stages from Instantly always apply (bounced, unsubscribed, not interested)
  if (isTerminalStage(newStage)) {
    return newStage;
  }

  // If existing is terminal, DON'T override with non-terminal (lead might have been rescued)
  if (isTerminalStage(existingStage)) {
    return existingStage;
  }

  // Non-terminal: keep the higher-ranked stage (no downgrades)
  const existingRank = getStageRank(existingStage);
  const newRank = getStageRank(newStage);

  return newRank > existingRank ? newStage : existingStage;
}

// =====================================================
// LEAD SCORING - Better deduplication
// =====================================================

// Score a lead for deduplication (higher = better/more important)
function scoreInstantlyLead(lead: InstantlyLead): number {
  let score = 0;

  // Primary: Interest status (meeting > interested > replied > opened > contacted)
  const interestStatus = lead.lt_interest_status || 0;
  switch (interestStatus) {
    case LEAD_INTEREST_STATUS.MEETING_COMPLETED:
      score += 500;
      break;
    case LEAD_INTEREST_STATUS.MEETING_BOOKED:
      score += 400;
      break;
    case LEAD_INTEREST_STATUS.INTERESTED:
      score += 300;
      break;
    case LEAD_INTEREST_STATUS.NOT_INTERESTED:
    case LEAD_INTEREST_STATUS.WRONG_PERSON:
      score += 100; // Still valuable info, but lower
      break;
    case LEAD_INTEREST_STATUS.OUT_OF_OFFICE:
      score += 50;
      break;
  }

  // Secondary: Reply count (capped contribution)
  score += Math.min(lead.email_reply_count || 0, 10) * 20;

  // Tertiary: Open count
  score += Math.min(lead.email_open_count || 0, 20) * 2;

  // Quaternary: Recent activity (newer is better)
  if (lead.timestamp_last_interest_change) {
    const lastInterest = new Date(lead.timestamp_last_interest_change).getTime();
    const ageHours = (Date.now() - lastInterest) / (1000 * 60 * 60);
    score += Math.max(0, 100 - ageHours); // Up to 100 points for very recent
  }

  return score;
}

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

// Hot filters - only leads we care about in the CRM pipeline
const HOT_FILTERS = [
  LEAD_FILTERS.REPLIED,
  LEAD_FILTERS.INTERESTED,
  LEAD_FILTERS.MEETING_BOOKED,
  LEAD_FILTERS.MEETING_COMPLETED,
];

// Batch size for DB operations
const BATCH_SIZE = 50;

interface ProspectData {
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  company_name: string | null;
  company_domain: string;
  phone: string | null;
  stage: string;
  emails_opened: number;
  emails_clicked: number;
  emails_replied: number;
  email_status: string;
  instantly_lead_id: string;
  last_contacted_at: string | null;
  is_interested: boolean;
  interest_indicated_at: string | null;
  updated_at: string;
  deal_value?: number;
  close_probability?: number;
  currency?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body for optional filters
    const body = await req.json().catch(() => ({}));
    const { campaign_id, direction = 'both', mode = 'hot' } = body;

    // Optional: Get user context
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    console.log(`[sync-instantly-leads] Starting sync (direction: ${direction}, mode: ${mode}, campaign: ${campaign_id || 'all'})`);

    let instantlyImported = 0;
    let instantlyUpdated = 0;
    let stagesUpgraded = 0;
    let stagesProtected = 0; // Downgrades prevented
    let terminalApplied = 0;
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

      // Cache CRM campaign IDs for batch processing
      const campaignIdCache: Record<string, string> = {};
      for (const instantlyCampaignId of campaignIds) {
        const { data: crmCampaign } = await supabase
          .from('crm_campaigns')
          .select('id')
          .eq('external_id', instantlyCampaignId)
          .maybeSingle();
        if (crmCampaign) {
          campaignIdCache[instantlyCampaignId] = crmCampaign.id;
        }
      }

      // Collect all leads across campaigns, deduped by email with SCORING
      const allLeads = new Map<string, { lead: InstantlyLead; crmCampaignId?: string; score: number }>();

      for (const instantlyCampaignId of campaignIds) {
        const crmCampaignId = campaignIdCache[instantlyCampaignId];

        // Determine which filters to use based on mode
        const filtersToUse = mode === 'hot' ? HOT_FILTERS : [undefined]; // undefined = all leads

        for (const filter of filtersToUse) {
          let hasMore = true;
          let startingAfter: string | undefined;
          let pageCount = 0;
          const maxPages = mode === 'hot' ? 10 : 50; // Limit pages for hot mode

          while (hasMore && pageCount < maxPages) {
            const response = await listLeads({
              campaign_id: instantlyCampaignId,
              filter: filter,
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
            pageCount++;

            // Dedupe by email using SCORE-BASED selection
            for (const lead of leads) {
              const email = lead.email.toLowerCase().trim();
              const newScore = scoreInstantlyLead(lead);
              const existing = allLeads.get(email);

              // Keep the lead with HIGHER score (more engagement/interest)
              if (!existing || newScore > existing.score) {
                allLeads.set(email, { lead, crmCampaignId, score: newScore });
              }
            }

            console.log(`[sync-instantly-leads] Fetched ${leads.length} leads (filter: ${filter || 'all'}, campaign: ${instantlyCampaignId}, page: ${pageCount})`);
          }
        }
      }

      console.log(`[sync-instantly-leads] Total unique leads to process: ${allLeads.size}`);

      // Convert to array for batch processing
      const leadsArray = Array.from(allLeads.entries());

      // Process in batches
      for (let i = 0; i < leadsArray.length; i += BATCH_SIZE) {
        const batch = leadsArray.slice(i, i + BATCH_SIZE);
        const emails = batch.map(([email]) => email);

        // Batch fetch existing prospects
        const { data: existingProspects } = await supabase
          .from('crm_prospects')
          .select('id, email, instantly_lead_id, stage, deal_value, close_probability, currency, owner_id')
          .in('email', emails);

        const existingMap = new Map(existingProspects?.map(p => [p.email.toLowerCase(), p]) || []);

        // Prepare batch operations
        const toInsert: any[] = [];
        const toUpdate: { id: string; data: Partial<ProspectData>; isTransitioningToQualified: boolean; ownerId?: string; stageChange: 'upgraded' | 'protected' | 'terminal' | 'same' }[] = [];
        const tasksToCreate: any[] = [];

        for (const [email, { lead, crmCampaignId }] of batch) {
          const instantlyStage = mapInstantlyStatusToStage(lead);
          const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || email.split('@')[0];

          const existing = existingMap.get(email);

          // COMPUTE FINAL STAGE with monotonic protection
          const finalStage = computeFinalStage(existing?.stage || null, instantlyStage);

          // Track what happened to the stage
          let stageChange: 'upgraded' | 'protected' | 'terminal' | 'same' = 'same';
          if (existing) {
            if (isTerminalStage(finalStage) && !isTerminalStage(existing.stage)) {
              stageChange = 'terminal';
            } else if (finalStage !== existing.stage && getStageRank(finalStage) > getStageRank(existing.stage)) {
              stageChange = 'upgraded';
            } else if (instantlyStage !== existing.stage && finalStage === existing.stage) {
              stageChange = 'protected'; // Downgrade was prevented
            }
          }

          const prospectData: ProspectData = {
            first_name: lead.first_name || null,
            last_name: lead.last_name || null,
            full_name: fullName,
            company_name: lead.company_name || null,
            company_domain: lead.company_domain || lead.website || email.split('@')[1],
            phone: lead.phone || null,
            stage: finalStage, // USE FINAL STAGE (monotonic)
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
          if (finalStage === 'qualified') {
            prospectData.deal_value = existing?.deal_value || 5000;
            prospectData.close_probability = existing?.close_probability || 20;
            prospectData.currency = existing?.currency || 'USD';
          }

          if (existing) {
            const isTransitioningToQualified = finalStage === 'qualified' && existing.stage !== 'qualified';
            toUpdate.push({
              id: existing.id,
              data: prospectData,
              isTransitioningToQualified,
              ownerId: existing.owner_id,
              stageChange,
            });
          } else {
            toInsert.push({
              email,
              ...prospectData,
              source: 'instantly',
              campaign_id: crmCampaignId,
              custom_fields: lead.payload || {},
            });
          }
        }

        // Batch update existing prospects
        for (const item of toUpdate) {
          try {
            const { error: updateError } = await supabase
              .from('crm_prospects')
              .update(item.data)
              .eq('id', item.id);

            if (updateError) {
              errors.push({ email: item.data.full_name, error: updateError.message });
            } else {
              instantlyUpdated++;

              // Track stage change stats
              switch (item.stageChange) {
                case 'upgraded':
                  stagesUpgraded++;
                  break;
                case 'protected':
                  stagesProtected++;
                  break;
                case 'terminal':
                  terminalApplied++;
                  break;
              }

              // Create task if transitioning to qualified
              if (item.isTransitioningToQualified) {
                tasksToCreate.push({
                  prospect_id: item.id,
                  activity_type: 'task',
                  subject: '🔥 HOT LEAD: Follow up immediately',
                  description: `Lead marked as ${item.data.stage} in Instantly. Reply count: ${item.data.emails_replied}`,
                  priority: 1,
                  due_date: new Date().toISOString().split('T')[0],
                  owner_id: item.ownerId,
                });
              }
            }
          } catch (err) {
            errors.push({ error: String(err) });
          }
        }

        // Batch insert new prospects
        if (toInsert.length > 0) {
          const { data: insertedProspects, error: insertError } = await supabase
            .from('crm_prospects')
            .insert(toInsert)
            .select('id, stage, emails_replied, owner_id');

          if (insertError) {
            errors.push({ error: `Batch insert failed: ${insertError.message}` });
          } else {
            instantlyImported += insertedProspects?.length || 0;

            // Create tasks for new qualified leads
            for (const prospect of insertedProspects || []) {
              if (prospect.stage === 'qualified') {
                tasksToCreate.push({
                  prospect_id: prospect.id,
                  activity_type: 'task',
                  subject: '🔥 HOT LEAD: Follow up immediately',
                  description: `Lead imported as qualified from Instantly. Reply count: ${prospect.emails_replied}`,
                  priority: 1,
                  due_date: new Date().toISOString().split('T')[0],
                  owner_id: prospect.owner_id,
                });
              }
            }
          }
        }

        // Batch insert tasks
        if (tasksToCreate.length > 0) {
          const { error: taskError } = await supabase
            .from('crm_activities')
            .insert(tasksToCreate);

          if (taskError) {
            console.error('[sync-instantly-leads] Failed to create tasks:', taskError);
          }
        }

        console.log(`[sync-instantly-leads] Processed batch ${Math.floor(i / BATCH_SIZE) + 1}: ${toInsert.length} inserts, ${toUpdate.length} updates`);
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

    const duration = Date.now() - startTime;

    // Log sync activity with stage change details
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

    console.log(`[sync-instantly-leads] Sync complete in ${duration}ms: ${instantlyImported} imported, ${instantlyUpdated} updated (${stagesUpgraded} upgraded, ${stagesProtected} protected, ${terminalApplied} terminal), ${crmPushed} pushed, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          instantly_imported: instantlyImported,
          instantly_updated: instantlyUpdated,
          stages_upgraded: stagesUpgraded,
          stages_protected: stagesProtected, // Downgrades prevented
          terminal_applied: terminalApplied,
          crm_pushed: crmPushed,
          errors: errors.length,
          duration_ms: duration,
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

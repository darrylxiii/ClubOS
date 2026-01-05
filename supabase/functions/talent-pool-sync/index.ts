import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { sync_type = 'all' } = await req.json().catch(() => ({}));

    console.log(`[talent-pool-sync] Starting sync: ${sync_type}`);

    const results = {
      tier_scores_updated: 0,
      move_probabilities_updated: 0,
      stale_profiles_flagged: 0,
      relationship_decay_detected: 0,
      job_changes_detected: 0,
      errors: [] as string[],
    };

    // Get all active candidates
    const { data: candidates, error: fetchError } = await supabase
      .from('candidate_profiles')
      .select('id, data_deletion_requested, gdpr_consent, last_activity_at, tier_score, talent_tier')
      .eq('data_deletion_requested', false)
      .is('gdpr_consent', true);

    if (fetchError) {
      throw fetchError;
    }

    console.log(`[talent-pool-sync] Processing ${candidates?.length || 0} candidates`);

    // Process in batches
    const batchSize = 50;
    const candidateIds = candidates?.map(c => c.id) || [];

    for (let i = 0; i < candidateIds.length; i += batchSize) {
      const batch = candidateIds.slice(i, i + batchSize);
      
      for (const candidateId of batch) {
        try {
          // 1. Update tier scores
          if (sync_type === 'all' || sync_type === 'tiers') {
            await supabase.rpc('update_candidate_tier', {
              p_candidate_id: candidateId,
              p_reason: 'nightly_sync'
            });
            results.tier_scores_updated++;
          }

          // 2. Update relationship metrics
          if (sync_type === 'all' || sync_type === 'relationships') {
            await supabase.rpc('update_relationship_metrics', {
              p_candidate_id: candidateId
            });
          }
        } catch (err) {
          console.error(`[talent-pool-sync] Error processing ${candidateId}:`, err);
          results.errors.push(`${candidateId}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    // 3. Detect stale profiles (no activity in 90 days)
    if (sync_type === 'all' || sync_type === 'stale') {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data: staleProfiles, error: staleError } = await supabase
        .from('candidate_profiles')
        .update({
          needs_human_review: true,
          review_reason: 'No activity in 90+ days - profile may be stale'
        })
        .lt('last_activity_at', ninetyDaysAgo.toISOString())
        .eq('needs_human_review', false)
        .neq('talent_tier', 'dormant')
        .select('id');

      if (!staleError) {
        results.stale_profiles_flagged = staleProfiles?.length || 0;
        console.log(`[talent-pool-sync] Flagged ${results.stale_profiles_flagged} stale profiles`);
      }
    }

    // 4. Detect relationship decay (warm/hot candidates with no contact in 30 days)
    if (sync_type === 'all' || sync_type === 'decay') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: decayedRelationships, error: decayError } = await supabase
        .from('candidate_relationships')
        .select(`
          id,
          candidate_id
        `)
        .lt('last_meaningful_contact', thirtyDaysAgo.toISOString());

      if (!decayError && decayedRelationships) {
        results.relationship_decay_detected = decayedRelationships.length;
        
        // Create agent events for relationship decay
        for (const rel of decayedRelationships) {
          await supabase.from('agent_events').insert({
            event_type: 'relationship_decay',
            event_source: 'talent-pool-sync',
            entity_type: 'candidate',
            entity_id: rel.candidate_id,
            event_data: {
              action_needed: 'Schedule follow-up to maintain relationship warmth'
            },
            priority: 7
          });
        }
        
        console.log(`[talent-pool-sync] Detected ${results.relationship_decay_detected} decaying relationships`);
      }
    }

    // 5. Detect job changes (candidates whose current company changed)
    if (sync_type === 'all' || sync_type === 'job_changes') {
      const { data: jobChanges, error: jobChangeError } = await supabase
        .from('candidate_profiles')
        .select('id, full_name')
        .eq('detected_job_change', true)
        .is('job_change_detected_at', null);

      if (!jobChangeError && jobChanges) {
        results.job_changes_detected = jobChanges.length;

        for (const candidate of jobChanges) {
          // Mark as detected
          await supabase
            .from('candidate_profiles')
            .update({
              job_change_detected_at: new Date().toISOString(),
              needs_human_review: true,
              review_reason: 'Job change detected - verify new position and update records'
            })
            .eq('id', candidate.id);

          // Create agent event
          await supabase.from('agent_events').insert({
            event_type: 'job_change_detected',
            event_source: 'talent-pool-sync',
            entity_type: 'candidate',
            entity_id: candidate.id,
            event_data: {
              candidate_name: candidate.full_name,
              action_needed: 'Verify new position and reach out for update'
            },
            priority: 8
          });
        }

        console.log(`[talent-pool-sync] Detected ${results.job_changes_detected} job changes`);
      }
    }

    // 6. Create predictive signals for high-priority actions
    if (sync_type === 'all' || sync_type === 'signals') {
      await createPredictiveSignals(supabase, results);
    }

    // 7. Update smart lists
    if (sync_type === 'all' || sync_type === 'lists') {
      await updateSmartLists(supabase);
    }

    console.log('[talent-pool-sync] Sync completed:', results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[talent-pool-sync] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function updateSmartLists(supabase: any) {
  console.log('[talent-pool-sync] Updating smart lists');

  // Get all smart lists with auto-refresh enabled
  const { data: smartLists, error } = await supabase
    .from('talent_pool_lists')
    .select('id, name, smart_criteria')
    .eq('list_type', 'smart')
    .eq('auto_refresh', true);

  if (error || !smartLists) return;

  for (const list of smartLists) {
    try {
      const criteria = list.smart_criteria;
      if (!criteria) continue;

      // Build query based on criteria
      let query = supabase
        .from('candidate_profiles')
        .select('id')
        .eq('data_deletion_requested', false);

      // Apply filters based on smart criteria
      if (criteria.min_move_probability) {
        query = query.gte('move_probability', criteria.min_move_probability);
      }
      if (criteria.tiers) {
        query = query.in('talent_tier', criteria.tiers);
      }
      if (criteria.availability_statuses) {
        query = query.in('availability_status', criteria.availability_statuses);
      }
      if (criteria.seniority_levels) {
        query = query.in('seniority_level', criteria.seniority_levels);
      }
      if (criteria.max_days_since_contact) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - criteria.max_days_since_contact);
        // This would need a join with candidate_relationships
      }

      const { data: matchingCandidates, error: matchError } = await query;

      if (matchError) {
        console.error(`[talent-pool-sync] Error updating smart list ${list.name}:`, matchError);
        continue;
      }

      // Clear existing members and add new ones
      await supabase
        .from('talent_pool_list_members')
        .delete()
        .eq('list_id', list.id);

      if (matchingCandidates && matchingCandidates.length > 0) {
        const members = matchingCandidates.map((c: any, index: number) => ({
          list_id: list.id,
          candidate_id: c.id,
          position: index + 1
        }));

        await supabase
          .from('talent_pool_list_members')
          .insert(members);
      }

      // Update count
      await supabase
        .from('talent_pool_lists')
        .update({ 
          candidate_count: matchingCandidates?.length || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', list.id);

      console.log(`[talent-pool-sync] Updated smart list "${list.name}" with ${matchingCandidates?.length || 0} candidates`);

    } catch (err) {
      console.error(`[talent-pool-sync] Error processing smart list ${list.id}:`, err);
    }
  }
}

async function createPredictiveSignals(supabase: any, results: any) {
  console.log('[talent-pool-sync] Creating predictive signals');

  // 1. Candidate withdrawal risk - hot candidates with declining engagement
  const { data: withdrawalRiskCandidates } = await supabase
    .from('candidate_profiles')
    .select(`
      id,
      full_name,
      talent_tier,
      move_probability,
      candidate_relationships!inner(warmth_score, last_meaningful_contact)
    `)
    .eq('talent_tier', 'hot')
    .gte('move_probability', 70);

  for (const candidate of withdrawalRiskCandidates || []) {
    const rel = candidate.candidate_relationships?.[0];
    if (!rel) continue;

    const lastContact = rel.last_meaningful_contact ? new Date(rel.last_meaningful_contact) : null;
    const daysSinceContact = lastContact 
      ? Math.floor((Date.now() - lastContact.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    // If warmth is declining and no recent contact
    if (daysSinceContact > 14 && rel.warmth_score < 60) {
      await supabase.from('predictive_signals').upsert({
        entity_type: 'candidate',
        entity_id: candidate.id,
        signal_type: 'candidate_withdrawal_risk',
        probability: Math.min(90, 50 + daysSinceContact),
        confidence: 0.75,
        contributing_factors: {
          days_since_contact: daysSinceContact,
          warmth_score: rel.warmth_score,
          move_probability: candidate.move_probability
        },
        recommended_actions: ['Schedule urgent follow-up call', 'Present new opportunity', 'Send personalized message'],
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }, { onConflict: 'entity_type,entity_id,signal_type' });
    }
  }

  // 2. Relationship decay signals
  const { data: decayingRelationships } = await supabase
    .from('candidate_relationships')
    .select(`
      id,
      candidate_id,
      warmth_score,
      last_meaningful_contact,
      candidate_profiles!inner(full_name, talent_tier)
    `)
    .lt('warmth_score', 50)
    .in('candidate_profiles.talent_tier', ['hot', 'warm']);

  for (const rel of decayingRelationships || []) {
    await supabase.from('predictive_signals').upsert({
      entity_type: 'relationship',
      entity_id: rel.id,
      signal_type: 'relationship_decay',
      probability: 100 - rel.warmth_score,
      confidence: 0.8,
      contributing_factors: {
        warmth_score: rel.warmth_score,
        candidate_tier: rel.candidate_profiles?.talent_tier
      },
      recommended_actions: ['Reconnect with personalized outreach', 'Share relevant industry news', 'Schedule catch-up call'],
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    }, { onConflict: 'entity_type,entity_id,signal_type' });
  }

  // 3. Placement opportunity - hot candidates matching open roles
  const { data: hotCandidates } = await supabase
    .from('candidate_profiles')
    .select('id, full_name, current_title, industries, functions, seniority_level')
    .eq('talent_tier', 'hot')
    .gte('move_probability', 75);

  const { data: openRoles } = await supabase
    .from('jobs')
    .select('id, title, industries, functions, level')
    .eq('is_active', true)
    .limit(50);

  for (const candidate of hotCandidates || []) {
    for (const role of openRoles || []) {
      // Simple matching logic
      const industryMatch = candidate.industries?.some((i: string) => 
        role.industries?.some((ri: string) => ri.toLowerCase().includes(i.toLowerCase()))
      );
      const functionMatch = candidate.functions?.some((f: string) => 
        role.functions?.some((rf: string) => rf.toLowerCase().includes(f.toLowerCase()))
      );

      if (industryMatch && functionMatch) {
        await supabase.from('predictive_signals').upsert({
          entity_type: 'candidate',
          entity_id: candidate.id,
          signal_type: 'placement_opportunity',
          probability: 70,
          confidence: 0.65,
          contributing_factors: {
            matching_role_id: role.id,
            matching_role_title: role.title,
            industry_match: industryMatch,
            function_match: functionMatch
          },
          recommended_actions: [`Present ${role.title} opportunity`, 'Schedule intro call with hiring manager'],
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }, { onConflict: 'entity_type,entity_id,signal_type' });
        break; // Only one signal per candidate
      }
    }
  }

  console.log('[talent-pool-sync] Predictive signals created');
}

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { publicCorsHeaders as corsHeaders } from "../_shared/cors-config.ts";

interface Signal {
  entity_type: string;
  entity_id: string;
  signal_type: string;
  signal_strength: number;
  evidence: Record<string, unknown>;
  contributing_factors: string[];
  recommended_actions: string[];
  expires_at: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { entity_type, entity_id } = await req.json().catch(() => ({}));

    console.log('[Predictive Signals] Detecting signals for:', entity_type || 'all', entity_id || 'all');

    const signals: Signal[] = [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. COMPANY SIGNALS
    if (!entity_type || entity_type === 'company') {
      let companiesQuery = supabase.from('companies').select('id, name');
      if (entity_id) {
        companiesQuery = companiesQuery.eq('id', entity_id);
      }
      const { data: companies } = await companiesQuery.limit(100);

      for (const company of companies || []) {
        // Get interaction history
        const { data: interactions } = await supabase
          .from('company_interactions')
          .select('created_at, interaction_type, sentiment_score')
          .eq('company_id', company.id)
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: true });

        if (interactions && interactions.length > 0) {
          // Detect COOLING OFF signal
          const recentInteractions = interactions.filter(
            i => new Date(i.created_at) >= fourteenDaysAgo
          );
          const olderInteractions = interactions.filter(
            i => new Date(i.created_at) < fourteenDaysAgo
          );

          if (olderInteractions.length > recentInteractions.length * 2 && olderInteractions.length >= 3) {
            signals.push({
              entity_type: 'company',
              entity_id: company.id,
              signal_type: 'cooling_off',
              signal_strength: Math.min(0.9, 0.5 + (olderInteractions.length - recentInteractions.length) * 0.1),
              evidence: {
                recent_count: recentInteractions.length,
                older_count: olderInteractions.length,
                last_interaction: interactions[interactions.length - 1].created_at
              },
              contributing_factors: [
                'Interaction frequency declining',
                `${olderInteractions.length} interactions in weeks 2-4 vs ${recentInteractions.length} in last 2 weeks`
              ],
              recommended_actions: [
                'Schedule touchpoint with primary stakeholder',
                'Send value-add content or market insight',
                'Review last interaction for potential issues'
              ],
              expires_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
            });
          }

          // Detect HEATING UP signal
          if (recentInteractions.length > olderInteractions.length * 1.5 && recentInteractions.length >= 3) {
            signals.push({
              entity_type: 'company',
              entity_id: company.id,
              signal_type: 'heating_up',
              signal_strength: Math.min(0.9, 0.5 + (recentInteractions.length - olderInteractions.length) * 0.1),
              evidence: {
                recent_count: recentInteractions.length,
                older_count: olderInteractions.length,
                trend: 'increasing'
              },
              contributing_factors: [
                'Interaction frequency increasing',
                `${recentInteractions.length} interactions in last 2 weeks`
              ],
              recommended_actions: [
                'Capitalize on momentum - propose next steps',
                'Introduce additional stakeholders',
                'Prepare proposals or candidates'
              ],
              expires_at: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()
            });
          }

          // Detect HIRING INTENT from interaction content
          const urgentKeywords = ['urgent', 'asap', 'immediately', 'budget approved', 'headcount', 'backfill'];
          const urgentInteractions = interactions.filter(i => {
            const content = JSON.stringify(i).toLowerCase();
            return urgentKeywords.some(k => content.includes(k));
          });

          if (urgentInteractions.length > 0) {
            signals.push({
              entity_type: 'company',
              entity_id: company.id,
              signal_type: 'hiring_intent',
              signal_strength: Math.min(0.95, 0.6 + urgentInteractions.length * 0.15),
              evidence: {
                urgent_mentions: urgentInteractions.length,
                keywords_detected: urgentKeywords.filter(k => 
                  interactions.some(i => JSON.stringify(i).toLowerCase().includes(k))
                )
              },
              contributing_factors: [
                'Urgency keywords detected in interactions',
                `${urgentInteractions.length} urgent-toned interactions`
              ],
              recommended_actions: [
                'Prioritize this account immediately',
                'Present top candidates within 48 hours',
                'Schedule strategy call with stakeholder'
              ],
              expires_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
            });
          }
        }

        // Check for active jobs without recent activity
        const { data: jobs } = await supabase
          .from('jobs')
          .select('id, title, created_at, updated_at')
          .eq('company_id', company.id)
          .in('status', ['active', 'open']);

        const staleJobs = (jobs || []).filter(j => 
          new Date(j.updated_at || j.created_at) < fourteenDaysAgo
        );

        if (staleJobs.length > 0) {
          signals.push({
            entity_type: 'company',
            entity_id: company.id,
            signal_type: 'relationship_risk',
            signal_strength: 0.6 + staleJobs.length * 0.1,
            evidence: {
              stale_jobs: staleJobs.map(j => ({ id: j.id, title: j.title })),
              count: staleJobs.length
            },
            contributing_factors: [
              `${staleJobs.length} active jobs without recent updates`,
              'May indicate stalled hiring process'
            ],
            recommended_actions: [
              'Check in on job status',
              'Offer updated candidate slate',
              'Discuss timeline and potential blockers'
            ],
            expires_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
          });
        }
      }
    }

    // 2. CANDIDATE SIGNALS
    if (!entity_type || entity_type === 'candidate') {
      // Find candidates who might be ready to move
      const { data: candidates } = await supabase
        .from('candidate_profiles')
        .select('id, full_name, current_company, updated_at, last_activity_at')
        .gte('updated_at', thirtyDaysAgo.toISOString())
        .limit(entity_id ? 1 : 100);

      for (const candidate of candidates || []) {
        if (entity_id && candidate.id !== entity_id) continue;

        // Check profile update frequency (indicates job searching)
        const { data: recentUpdates } = await supabase
          .from('candidate_profiles')
          .select('updated_at')
          .eq('id', candidate.id)
          .single();

        // Check for resurrection candidates
        const { data: history } = await supabase
          .from('candidate_company_history')
          .select('*')
          .eq('candidate_id', candidate.id)
          .eq('could_revisit', true)
          .lte('revisit_after', now.toISOString());

        if (history && history.length > 0) {
          signals.push({
            entity_type: 'candidate',
            entity_id: candidate.id,
            signal_type: 're_engagement',
            signal_strength: 0.8,
            evidence: {
              opportunities: history.map(h => ({
                company_id: h.company_id,
                previous_outcome: h.interaction_type,
                reason: h.outcome_reason
              }))
            },
            contributing_factors: [
              `${history.length} previous opportunities ready for re-engagement`,
              'Revisit date has passed'
            ],
            recommended_actions: [
              'Reach out to candidate about new opportunities',
              'Review previous feedback before contact',
              'Check for matching active roles'
            ],
            expires_at: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
          });
        }
      }
    }

    // 3. DEAL/JOB SIGNALS
    if (!entity_type || entity_type === 'job') {
      const { data: activeJobs } = await supabase
        .from('jobs')
        .select(`
          id, title, company_id, created_at, updated_at,
          applications(id, status, updated_at)
        `)
        .in('status', ['active', 'open'])
        .limit(entity_id ? 1 : 50);

      for (const job of activeJobs || []) {
        if (entity_id && job.id !== entity_id) continue;

        const applications = job.applications || [];
        const recentApps = applications.filter(
          a => new Date(a.updated_at) >= sevenDaysAgo
        );

        // Detect opportunity window (lots of recent activity)
        if (recentApps.length >= 3) {
          signals.push({
            entity_type: 'job',
            entity_id: job.id,
            signal_type: 'opportunity_window',
            signal_strength: Math.min(0.9, 0.5 + recentApps.length * 0.1),
            evidence: {
              recent_applications: recentApps.length,
              total_applications: applications.length,
              stages: recentApps.map(a => a.status)
            },
            contributing_factors: [
              `${recentApps.length} applications updated in last 7 days`,
              'Active hiring process'
            ],
            recommended_actions: [
              'Ensure strong candidates in pipeline',
              'Follow up on pending feedback',
              'Prepare backup candidates'
            ],
            expires_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
          });
        }

        // Detect stalled process
        const daysSinceUpdate = Math.floor(
          (now.getTime() - new Date(job.updated_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceUpdate > 14 && applications.length > 0) {
          signals.push({
            entity_type: 'job',
            entity_id: job.id,
            signal_type: 'cooling_off',
            signal_strength: Math.min(0.85, 0.4 + daysSinceUpdate * 0.02),
            evidence: {
              days_since_update: daysSinceUpdate,
              pending_applications: applications.filter(a => 
                !['hired', 'rejected', 'withdrawn'].includes(a.status)
              ).length
            },
            contributing_factors: [
              `No updates in ${daysSinceUpdate} days`,
              'Applications may be stalled'
            ],
            recommended_actions: [
              'Check with hiring manager on status',
              'Review if requirements have changed',
              'Consider fresh candidates'
            ],
            expires_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
          });
        }
      }
    }

    // Expire old signals and insert new ones
    await supabase
      .from('predictive_signals')
      .update({ is_active: false })
      .lt('expires_at', now.toISOString());

    // Insert new signals
    if (signals.length > 0) {
      const { error } = await supabase
        .from('predictive_signals')
        .upsert(
          signals.map(s => ({
            ...s,
            is_active: true,
            detected_at: now.toISOString()
          })),
          { onConflict: 'entity_type,entity_id,signal_type' }
        );

      if (error) {
        console.error('[Predictive Signals] Insert error:', error);
      }
    }

    console.log('[Predictive Signals] Detected', signals.length, 'signals');

    return new Response(
      JSON.stringify({
        success: true,
        signals_detected: signals.length,
        signals: signals.map(s => ({
          entity: `${s.entity_type}:${s.entity_id}`,
          type: s.signal_type,
          strength: s.signal_strength,
          actions: s.recommended_actions
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Predictive Signals] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

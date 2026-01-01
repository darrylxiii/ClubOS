import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompanyContext {
  company: Record<string, unknown>;
  stakeholders: Array<Record<string, unknown>>;
  stakeholder_memories: Array<Record<string, unknown>>;
  recent_interactions: Array<Record<string, unknown>>;
  active_jobs: Array<Record<string, unknown>>;
  candidate_history: Array<Record<string, unknown>>;
  intelligence_score: Record<string, unknown> | null;
  predictive_signals: Array<Record<string, unknown>>;
  key_insights: Array<Record<string, unknown>>;
  relationship_graph: Array<Record<string, unknown>>;
  meeting_history: Array<Record<string, unknown>>;
  success_patterns: Array<Record<string, unknown>>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { company_id, include_full_history = false } = await req.json();

    if (!company_id) {
      throw new Error('company_id is required');
    }

    console.log('[Company Context] Fetching context for:', company_id);

    // Parallel fetch all company data
    const [
      companyResult,
      stakeholdersResult,
      interactionsResult,
      jobsResult,
      candidateHistoryResult,
      intelligenceScoreResult,
      signalsResult,
      insightsResult,
      relationshipsResult,
      meetingsResult,
      patternsResult
    ] = await Promise.all([
      // Company details
      supabase
        .from('companies')
        .select('*')
        .eq('id', company_id)
        .single(),

      // Stakeholders with their memories
      supabase
        .from('company_stakeholders')
        .select(`
          *,
          stakeholder_memory(*)
        `)
        .eq('company_id', company_id)
        .order('influence_score', { ascending: false }),

      // Recent interactions
      supabase
        .from('company_interactions')
        .select(`
          *,
          interaction_insights(*)
        `)
        .eq('company_id', company_id)
        .order('created_at', { ascending: false })
        .limit(include_full_history ? 100 : 20),

      // Active jobs
      supabase
        .from('jobs')
        .select('*')
        .eq('company_id', company_id)
        .in('status', ['active', 'open', 'interviewing']),

      // Candidate history with this company
      supabase
        .from('candidate_company_history')
        .select(`
          *,
          candidate_profiles(id, full_name, current_title, current_company)
        `)
        .eq('company_id', company_id)
        .order('created_at', { ascending: false })
        .limit(50),

      // Intelligence score
      supabase
        .from('company_intelligence_scores')
        .select('*')
        .eq('company_id', company_id)
        .single(),

      // Active predictive signals
      supabase
        .from('predictive_signals')
        .select('*')
        .eq('entity_type', 'company')
        .eq('entity_id', company_id)
        .eq('is_active', true)
        .order('signal_strength', { ascending: false }),

      // Key insights
      supabase
        .from('interaction_insights')
        .select('*')
        .eq('company_id', company_id)
        .order('created_at', { ascending: false })
        .limit(20),

      // Relationship graph
      supabase
        .from('entity_relationships')
        .select('*')
        .or(`and(source_type.eq.company,source_id.eq.${company_id}),and(target_type.eq.company,target_id.eq.${company_id})`)
        .order('strength_score', { ascending: false })
        .limit(50),

      // Meeting history
      supabase
        .from('meetings')
        .select(`
          id, title, scheduled_start, status, meeting_type,
          meeting_participants(participant_type, external_name),
          meeting_recordings_extended(transcript, summary)
        `)
        .eq('company_id', company_id)
        .order('scheduled_start', { ascending: false })
        .limit(include_full_history ? 50 : 10),

      // Success patterns for this company's industry
      supabase
        .from('success_patterns')
        .select('*')
        .order('success_rate', { ascending: false })
        .limit(10)
    ]);

    // Build context object
    const context: CompanyContext = {
      company: companyResult.data || {},
      stakeholders: stakeholdersResult.data || [],
      stakeholder_memories: (stakeholdersResult.data || [])
        .flatMap(s => s.stakeholder_memory || []),
      recent_interactions: interactionsResult.data || [],
      active_jobs: jobsResult.data || [],
      candidate_history: candidateHistoryResult.data || [],
      intelligence_score: intelligenceScoreResult.data,
      predictive_signals: signalsResult.data || [],
      key_insights: insightsResult.data || [],
      relationship_graph: relationshipsResult.data || [],
      meeting_history: meetingsResult.data || [],
      success_patterns: patternsResult.data || []
    };

    // Generate executive summary
    const summary = generateExecutiveSummary(context);

    // Log the query for learning
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        await supabase.from('intelligence_queries').insert({
          user_id: user.id,
          query_type: 'company_context',
          query_params: { company_id, include_full_history },
          results_count: Object.values(context).flat().length
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        company_id,
        context,
        summary,
        generated_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Company Context] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateExecutiveSummary(context: CompanyContext): Record<string, unknown> {
  const { company, stakeholders, recent_interactions, candidate_history, intelligence_score, predictive_signals } = context;

  // Calculate engagement health
  const recentInteractionCount = recent_interactions.filter(
    i => new Date(i.created_at as string) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  ).length;

  const engagementLevel = recentInteractionCount > 10 ? 'high' 
                        : recentInteractionCount > 3 ? 'medium' 
                        : 'low';

  // Find key stakeholders
  const keyStakeholders = stakeholders
    .filter(s => (s.influence_score as number) >= 0.7)
    .map(s => ({ name: s.name, role: s.role, influence: s.influence_score }));

  // Summarize candidate pipeline
  const candidateSummary = {
    total_candidates: candidate_history.length,
    hired: candidate_history.filter(c => c.interaction_type === 'hired').length,
    could_revisit: candidate_history.filter(c => c.could_revisit).length,
    recent_rejects: candidate_history.filter(
      c => c.interaction_type === 'rejected' && 
      new Date(c.created_at as string) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    ).length
  };

  // Active signals summary
  const activeSignals = predictive_signals.map(s => ({
    type: s.signal_type,
    strength: s.signal_strength,
    actions: s.recommended_actions
  }));

  return {
    company_name: company.name,
    engagement_level: engagementLevel,
    intelligence_score: intelligence_score?.overall_score || 0,
    key_stakeholders: keyStakeholders,
    candidate_pipeline: candidateSummary,
    active_signals: activeSignals,
    last_interaction: recent_interactions[0]?.created_at || null,
    recommended_actions: generateRecommendations(context)
  };
}

function generateRecommendations(context: CompanyContext): string[] {
  const recommendations: string[] = [];
  const { recent_interactions, predictive_signals, candidate_history, stakeholders } = context;

  // Check for cooling signals
  const coolingSignal = predictive_signals.find(s => s.signal_type === 'cooling_off');
  if (coolingSignal) {
    recommendations.push('⚠️ Engagement cooling detected - schedule touchpoint with key stakeholder');
  }

  // Check for resurrection candidates
  const revivableCandidates = candidate_history.filter(c => 
    c.could_revisit && 
    c.revisit_after && 
    new Date(c.revisit_after as string) <= new Date()
  );
  if (revivableCandidates.length > 0) {
    recommendations.push(`🔄 ${revivableCandidates.length} candidate(s) ready for re-engagement`);
  }

  // Check for stakeholder gaps
  const hasDecisionMaker = stakeholders.some(s => 
    (s.influence_score as number) >= 0.8 || 
    (s.role as string)?.toLowerCase().includes('head') ||
    (s.role as string)?.toLowerCase().includes('director')
  );
  if (!hasDecisionMaker && stakeholders.length > 0) {
    recommendations.push('📊 No clear decision-maker identified - expand stakeholder mapping');
  }

  // Check interaction recency
  const lastInteraction = recent_interactions[0];
  if (lastInteraction) {
    const daysSince = Math.floor(
      (Date.now() - new Date(lastInteraction.created_at as string).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSince > 14) {
      recommendations.push(`📅 No interaction in ${daysSince} days - schedule follow-up`);
    }
  }

  // Hiring intent detection
  const hiringSignal = predictive_signals.find(s => s.signal_type === 'hiring_intent');
  if (hiringSignal && (hiringSignal.signal_strength as number) > 0.7) {
    recommendations.push('🎯 High hiring intent detected - prioritize this account');
  }

  return recommendations.slice(0, 5); // Max 5 recommendations
}

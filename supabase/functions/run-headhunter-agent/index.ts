import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      console.warn('[Headhunter] LOVABLE_API_KEY missing. Returning MOCK response for testing.');
      return new Response(
        JSON.stringify({
          success: true,
          job: "Mock Job (Local Test)",
          persona: "Mock Persona (Local Test)",
          matches_found: 1,
          matches_saved: 0,
          saved_matches: [],
          note: "Running in MOCK mode because LOVABLE_API_KEY is not set."
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch Open Jobs (Limit to 1 for MVP/Demo)
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, title, description, company_id')
      .eq('status', 'open')
      .limit(1);

    if (jobsError) throw new Error(`Failed to fetch jobs: ${jobsError.message}`);
    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ message: "No open jobs found." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const job = jobs[0];
    console.log(`[Headhunter] Processing Job: ${job.title} (${job.id})`);

    // 2. Generate Search Persona using flash-lite (was broken gpt-4o-mini)
    const personaPrompt = `You are an expert Technical Recruiter.
Read this Job Description and create a "Search Persona" string that describes the perfect candidate in natural language.
Include: Years of experience, specific hard skills, soft skills, and previous roles.
KEEP IT UNDER 50 WORDS.
Job Title: ${job.title}
Description: ${job.description || "N/A"}`;

    let searchPersona = `${job.title} with relevant experience`;
    try {
      const personaResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite',
          messages: [{ role: 'user', content: personaPrompt }],
          max_tokens: 100,
        })
      });
      if (personaResp.ok) {
        const data = await personaResp.json();
        searchPersona = data.choices[0].message.content.trim();
        console.log(`[Headhunter] Generated Persona: "${searchPersona}"`);
      }
    } catch (e) {
      console.warn('[Headhunter] Persona generation failed, using title.', e);
    }

    // 3. Execute Search (Using our Advanced RAG Brain)
    const { data: searchResults, error: searchError } = await supabase.functions.invoke('retrieve-context', {
      body: {
        query: searchPersona,
        company_id: job.company_id
      }
    });

    if (searchError) throw new Error(`Search failed: ${searchError.message}`);

    const matches = searchResults?.matches || [];
    console.log(`[Headhunter] Found ${matches.length} potential matches.`);

    // 4. Process & Evaluate Matches
    const agentMatches = [];

    for (const match of matches) {
      let candidateId = null;
      if (match.metadata?.candidate_id) candidateId = match.metadata.candidate_id;
      else if (match.metadata?.source_type === 'candidate') candidateId = match.metadata.source_id;
      else if (match.metadata?.target_type === 'candidate') candidateId = match.metadata.target_id;

      if (candidateId) {
        // Deduplicate check
        const { data: existing } = await supabase
          .from('agent_matches')
          .select('id')
          .eq('job_id', job.id)
          .eq('candidate_id', candidateId)
          .maybeSingle();

        if (!existing) {
          const { data: inserted } = await supabase
            .from('agent_matches')
            .insert({
              job_id: job.id,
              candidate_id: candidateId,
              match_score: match.similarity || 0.7,
              match_reasoning: `Matched via ${match.metadata?.type || 'context'}: ${match.content.substring(0, 100)}...`,
              status: 'pending_review',
              metadata: match.metadata
            })
            .select()
            .single();

          if (inserted) agentMatches.push(inserted);
        }
      }
    }

    // Auto-create sourcing mission if internal matches are thin (<5)
    if (agentMatches.length < 5) {
      console.log(`[Headhunter] Only ${agentMatches.length} internal matches. Creating sourcing mission.`);
      await supabase.from('sourcing_missions').insert({
        job_id: job.id,
        status: 'pending',
        triggered_by: 'headhunter_auto',
        search_criteria: { persona: searchPersona, internal_matches: agentMatches.length },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        job: job.title,
        persona: searchPersona,
        matches_found: matches.length,
        matches_saved: agentMatches.length,
        saved_matches: agentMatches,
        sourcing_mission_created: agentMatches.length < 5,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Headhunter] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

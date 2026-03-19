import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function fuzzyMatch(candidateSkill: string, requiredSkill: string): boolean {
  const a = candidateSkill.toLowerCase().trim();
  const b = requiredSkill.toLowerCase().trim();
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  // Handle common variations: "React.js" vs "React", "Node.js" vs "Node"
  const normalize = (s: string) => s.replace(/[.\-_\/]/g, '').replace(/js$/i, '').trim();
  return normalize(a) === normalize(b);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // Validate user
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { job_id, candidate_ids } = await req.json();

    if (!job_id) {
      return new Response(JSON.stringify({ error: 'job_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch job requirements
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('requirements, nice_to_have, title')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const mustHave: string[] = (job.requirements as string[]) || [];
    const niceToHave: string[] = (job.nice_to_have as string[]) || [];

    if (mustHave.length === 0 && niceToHave.length === 0) {
      return new Response(JSON.stringify({
        message: 'No job requirements defined — cannot calculate skill match',
        results: [],
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Build query for applications
    let query = supabase
      .from('applications')
      .select('id, candidate_id, match_score')
      .eq('job_id', job_id);

    if (candidate_ids && Array.isArray(candidate_ids) && candidate_ids.length > 0) {
      query = query.in('candidate_id', candidate_ids);
    }

    const { data: applications, error: appError } = await query;
    if (appError) {
      console.error('[calculate-skill-match] Applications fetch error:', appError);
      return new Response(JSON.stringify({ error: 'Failed to fetch applications' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!applications || applications.length === 0) {
      return new Response(JSON.stringify({ message: 'No applications found', results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch candidate skills
    const candidateIds = [...new Set(applications.map(a => a.candidate_id).filter(Boolean))];
    const { data: candidates } = await supabase
      .from('candidate_profiles')
      .select('id, skills, full_name')
      .in('id', candidateIds);

    const candidateMap = new Map((candidates || []).map(c => [c.id, c]));

    const results: Array<{
      application_id: string;
      candidate_id: string;
      candidate_name: string;
      skill_match_score: number;
      must_have_matched: string[];
      must_have_missing: string[];
      nice_to_have_matched: string[];
      nice_to_have_missing: string[];
    }> = [];

    for (const app of applications) {
      const candidate = candidateMap.get(app.candidate_id);
      const candidateSkills: string[] = (candidate?.skills as string[]) || [];

      const mustHaveMatched = mustHave.filter(req =>
        candidateSkills.some(skill => fuzzyMatch(skill, req))
      );
      const mustHaveMissing = mustHave.filter(req =>
        !candidateSkills.some(skill => fuzzyMatch(skill, req))
      );
      const niceMatched = niceToHave.filter(req =>
        candidateSkills.some(skill => fuzzyMatch(skill, req))
      );
      const niceMissing = niceToHave.filter(req =>
        !candidateSkills.some(skill => fuzzyMatch(skill, req))
      );

      // Weighted score: 70% must-have, 30% nice-to-have
      const mustHaveScore = mustHave.length > 0 ? mustHaveMatched.length / mustHave.length : 1;
      const niceScore = niceToHave.length > 0 ? niceMatched.length / niceToHave.length : 1;

      let score: number;
      if (mustHave.length > 0 && niceToHave.length > 0) {
        score = Math.round((mustHaveScore * 0.7 + niceScore * 0.3) * 100);
      } else if (mustHave.length > 0) {
        score = Math.round(mustHaveScore * 100);
      } else {
        score = Math.round(niceScore * 100);
      }

      const details = {
        must_have_matched: mustHaveMatched,
        must_have_missing: mustHaveMissing,
        nice_to_have_matched: niceMatched,
        nice_to_have_missing: niceMissing,
        candidate_skills: candidateSkills,
        total_must_have: mustHave.length,
        total_nice_to_have: niceToHave.length,
        score,
        calculated_at: new Date().toISOString(),
      };

      // Update application with score and details
      await supabase
        .from('applications')
        .update({
          match_score: score,
          skill_match_details: details,
        })
        .eq('id', app.id);

      results.push({
        application_id: app.id,
        candidate_id: app.candidate_id,
        candidate_name: candidate?.full_name || 'Unknown',
        skill_match_score: score,
        must_have_matched: mustHaveMatched,
        must_have_missing: mustHaveMissing,
        nice_to_have_matched: niceMatched,
        nice_to_have_missing: niceMissing,
      });
    }

    const avgScore = results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.skill_match_score, 0) / results.length)
      : 0;

    console.log(`[calculate-skill-match] Scored ${results.length} candidates for job ${job_id}. Avg: ${avgScore}%`);

    return new Response(JSON.stringify({
      total: results.length,
      average_score: avgScore,
      results,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[calculate-skill-match] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

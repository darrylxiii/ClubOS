import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from '../_shared/cors.ts';

interface MatchFactors {
  skillOverlap: number;
  experienceMatch: number;
  salaryAlignment: number;
  cultureFit: number;
  assessmentFit: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify user
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const { jobId } = await req.json();
    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'jobId is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch candidate profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_title, location, skills, years_experience, desired_salary_min, desired_salary_max')
      .eq('id', user.id)
      .single();

    // Fetch job
    const { data: job } = await supabase
      .from('jobs')
      .select('*, companies(name, culture_values)')
      .eq('id', jobId)
      .single();

    if (!job || !profile) {
      return new Response(
        JSON.stringify({ error: 'Job or profile not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Calculate match factors
    const factors: MatchFactors = {
      skillOverlap: calculateSkillMatch(profile.skills || [], job.tags || []),
      experienceMatch: calculateExperienceMatch(profile.years_experience, job.experience_required || 0),
      salaryAlignment: calculateSalaryMatch(
        profile.desired_salary_min, 
        profile.desired_salary_max, 
        job.salary_min, 
        job.salary_max
      ),
      cultureFit: 75, // Default for now
      assessmentFit: 70  // Default for now
    };

    // Weighted scoring
    const overallScore = Math.round(
      factors.skillOverlap * 0.30 +
      factors.experienceMatch * 0.20 +
      factors.salaryAlignment * 0.15 +
      factors.cultureFit * 0.20 +
      factors.assessmentFit * 0.15
    );

    // Generate explanation
    const explanation = generateMatchExplanation(factors, overallScore);

    // Store match score
    await supabase.from('match_scores').upsert({
      user_id: user.id,
      job_id: jobId,
      overall_score: overallScore,
      club_match_factors: factors,
      calculated_at: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({ score: overallScore, factors, explanation }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in calculate-enhanced-match:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateSkillMatch(candidateSkills: string[], jobSkills: string[]): number {
  if (!jobSkills.length) return 100;
  const normalizedCandidateSkills = candidateSkills.map(s => s.toLowerCase());
  const normalizedJobSkills = jobSkills.map(s => s.toLowerCase());
  const matches = normalizedJobSkills.filter(skill => 
    normalizedCandidateSkills.some(cs => cs.includes(skill) || skill.includes(cs))
  );
  return Math.round((matches.length / normalizedJobSkills.length) * 100);
}

function calculateExperienceMatch(candidateExp: number | null, requiredExp: number): number {
  if (!requiredExp) return 100;
  if (!candidateExp) return 50;
  if (candidateExp >= requiredExp) return 100;
  return Math.max(50, Math.round((candidateExp / requiredExp) * 100));
}

function calculateSalaryMatch(candidateMin: number | null, candidateMax: number | null, jobMin: number | null, jobMax: number | null): number {
  if (!candidateMin || !jobMax) return 80;
  if (candidateMin <= jobMax && (!candidateMax || candidateMax >= (jobMin || 0))) return 100;
  if (candidateMin > jobMax) return Math.max(40, 100 - ((candidateMin - jobMax) / jobMax * 100));
  return 80;
}

function generateMatchExplanation(factors: MatchFactors, score: number): string {
  const highlights: string[] = [];
  if (factors.skillOverlap >= 80) highlights.push('Strong skills alignment');
  if (factors.experienceMatch >= 90) highlights.push('Experience level matches perfectly');
  if (factors.salaryAlignment >= 90) highlights.push('Salary expectations align');
  
  if (score >= 85) {
    return `Excellent match! ${highlights.join(', ')}.`;
  } else if (score >= 70) {
    return `Good match. ${highlights.length > 0 ? highlights.join(', ') : 'Several factors align well'}.`;
  }
  return 'Some alignment with this role.';
}

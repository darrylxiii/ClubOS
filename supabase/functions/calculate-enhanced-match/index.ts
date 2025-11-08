import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from '../_shared/cors.ts';

// Structured logging utility
function log(level: 'info' | 'error' | 'warn', message: string, context?: any) {
  const timestamp = new Date().toISOString();
  console[level](`[${timestamp}] [${level.toUpperCase()}] ${message}`, context || '');
}

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
      log('error', 'Auth error', { authError });
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const { jobId } = await req.json();
    if (!jobId) {
      log('warn', 'Missing jobId in request');
      return new Response(
        JSON.stringify({ error: 'jobId is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    log('info', 'Calculating match', { userId: user.id, jobId });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch candidate profile with all relevant matching fields
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id, 
        current_title, 
        location, 
        desired_salary_min, 
        desired_salary_max,
        years_of_experience,
        skills,
        preferred_job_types,
        preferred_locations,
        salary_expectation_min,
        salary_expectation_max,
        salary_expectation_currency
      `)
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      log('error', 'Error fetching profile', { profileError, userId: user.id });
    }

    // Fetch job with skills and requirements
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        *, 
        companies(name, values),
        job_tools(
          is_required,
          tools_and_skills(name)
        )
      `)
      .eq('id', jobId)
      .maybeSingle();

    if (jobError) {
      log('error', 'Error fetching job', { jobError, jobId });
    }

    if (!job) {
      log('warn', 'Job not found', { jobId });
      return new Response(
        JSON.stringify({ error: 'Job not found', jobId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    if (!profile) {
      log('warn', 'Profile not found', { userId: user.id });
      return new Response(
        JSON.stringify({ error: 'Profile not found', userId: user.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Extract job skills from job_tools relation
    const jobSkills = job.job_tools
      ?.filter((jt: any) => jt.is_required)
      .map((jt: any) => jt.tools_and_skills?.name)
      .filter(Boolean) || [];
    
    const candidateSkills = profile.skills || [];

    // Calculate match factors with real data
    const factors: MatchFactors = {
      skillOverlap: calculateSkillMatch(candidateSkills, jobSkills),
      experienceMatch: calculateExperienceMatch(
        profile.years_of_experience, 
        job.years_of_experience_required || 0
      ),
      salaryAlignment: calculateSalaryMatch(
        profile.salary_expectation_min || profile.desired_salary_min, 
        profile.salary_expectation_max || profile.desired_salary_max, 
        job.salary_min, 
        job.salary_max
      ),
      cultureFit: calculateLocationMatch(profile.location, profile.preferred_locations, job.location, job.remote_work_policy),
      assessmentFit: calculateJobTypeMatch(profile.preferred_job_types, job.employment_type)
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

    log('info', 'Match calculated successfully', { userId: user.id, jobId, overallScore });

    // Store match score
    const { error: upsertError } = await supabase.from('match_scores').upsert({
      user_id: user.id,
      job_id: jobId,
      overall_score: overallScore,
      club_match_factors: factors,
      calculated_at: new Date().toISOString()
    });

    if (upsertError) {
      log('error', 'Error storing match score', { upsertError, userId: user.id, jobId });
    }

    return new Response(
      JSON.stringify({ score: overallScore, factors, explanation }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    log('error', 'Unhandled error in calculate-enhanced-match', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateSkillMatch(candidateSkills: string[], jobSkills: string[]): number {
  if (!jobSkills || jobSkills.length === 0) return 100;
  if (!candidateSkills || candidateSkills.length === 0) return 20;
  
  const normalizedCandidateSkills = candidateSkills.map(s => s.toLowerCase());
  const normalizedJobSkills = jobSkills.map(s => s.toLowerCase());
  
  const matches = normalizedJobSkills.filter(skill => 
    normalizedCandidateSkills.some(cs => cs.includes(skill) || skill.includes(cs))
  );
  
  // Give partial credit for having some skills
  const matchRatio = matches.length / jobSkills.length;
  const baseScore = matchRatio * 100;
  const bonusForExtraSkills = Math.min(candidateSkills.length / jobSkills.length, 0.2) * 100;
  
  return Math.round(Math.min(baseScore + bonusForExtraSkills, 100));
}

function calculateExperienceMatch(candidateExp: number | null, requiredExp: number): number {
  if (!requiredExp || requiredExp === 0) return 100;
  if (!candidateExp || candidateExp === 0) return 30;
  
  const ratio = candidateExp / requiredExp;
  
  // Perfect match or more experience
  if (ratio >= 1.2) return 100; // Extra points for senior candidates
  if (ratio >= 1) return 95;
  if (ratio >= 0.8) return 85;
  if (ratio >= 0.6) return 75;
  if (ratio >= 0.4) return 60;
  if (ratio >= 0.2) return 45;
  return 30;
}

function calculateSalaryMatch(candidateMin: number | null, candidateMax: number | null, jobMin: number | null, jobMax: number | null): number {
  // If no salary data from either side, assume neutral
  if (!jobMin && !jobMax) return 100;
  if (!candidateMin && !candidateMax) return 70; // Slight penalty for not specifying
  
  const candMid = ((candidateMin || 0) + (candidateMax || candidateMin || 100000)) / 2;
  const jobMid = ((jobMin || 0) + (jobMax || jobMin || 100000)) / 2;
  
  // Check if ranges overlap
  const candLow = candidateMin || candMid * 0.8;
  const candHigh = candidateMax || candMid * 1.2;
  const jobLow = jobMin || jobMid * 0.8;
  const jobHigh = jobMax || jobMid * 1.2;
  
  const hasOverlap = !(candHigh < jobLow || candLow > jobHigh);
  
  if (hasOverlap) {
    // Calculate how much they overlap
    const overlapLow = Math.max(candLow, jobLow);
    const overlapHigh = Math.min(candHigh, jobHigh);
    const overlapSize = overlapHigh - overlapLow;
    const totalRange = Math.max(candHigh, jobHigh) - Math.min(candLow, jobLow);
    const overlapRatio = overlapSize / totalRange;
    
    return Math.round(70 + (overlapRatio * 30)); // 70-100 range
  }
  
  // No overlap - calculate distance
  const diff = Math.abs(candMid - jobMid) / Math.max(jobMid, candMid);
  if (diff <= 0.15) return 65;
  if (diff <= 0.25) return 55;
  if (diff <= 0.40) return 40;
  return 25;
}

function calculateLocationMatch(userLocation: string | null, preferredLocations: string[] | null, jobLocation: string | null, remotePolicy: string | null): number {
  // Remote jobs score high
  if (remotePolicy === 'fully_remote' || jobLocation?.toLowerCase().includes('remote')) return 100;
  
  // If user has no location preferences, assume flexible
  if (!preferredLocations || preferredLocations.length === 0) return 80;
  
  // Check if job location matches any preferred location
  const jobLoc = (jobLocation || '').toLowerCase();
  const hasMatch = preferredLocations.some(loc => 
    jobLoc.includes(loc.toLowerCase()) || loc.toLowerCase().includes(jobLoc)
  );
  
  if (hasMatch) return 100;
  if (remotePolicy === 'hybrid') return 70;
  return 50;
}

function calculateJobTypeMatch(preferredTypes: string[] | null, jobType: string | null): number {
  // If no preferences set, assume flexible
  if (!preferredTypes || preferredTypes.length === 0) return 85;
  if (!jobType) return 70;
  
  const normalizedJobType = jobType.toLowerCase();
  const hasMatch = preferredTypes.some(type => type.toLowerCase() === normalizedJobType);
  
  return hasMatch ? 100 : 60;
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

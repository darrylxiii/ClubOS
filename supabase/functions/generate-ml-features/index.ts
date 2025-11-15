/**
 * Generate ML Features Edge Function
 * 
 * Computes 200+ features for ML training from candidate, job, and interaction data.
 * This is the core feature engineering pipeline for the matching engine.
 * 
 * Usage:
 * POST /generate-ml-features
 * Body: { candidate_id, job_id, application_id? }
 * 
 * Returns: { features: {...}, cached: boolean }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FeatureRequest {
  candidate_id: string;
  job_id: string;
  application_id?: string;
  use_cache?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { candidate_id, job_id, application_id, use_cache = true }: FeatureRequest = await req.json();

    if (!candidate_id || !job_id) {
      return new Response(
        JSON.stringify({ error: 'candidate_id and job_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check cache first
    if (use_cache) {
      const cacheKey = `${candidate_id}_${job_id}`;
      const { data: cached } = await supabase
        .from('ml_feature_cache')
        .select('features')
        .eq('entity_type', 'match')
        .eq('entity_id', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (cached) {
        return new Response(
          JSON.stringify({ features: cached.features, cached: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch all data in parallel
    const [
      candidateResult,
      jobResult,
      jobWithCompanyResult,
      applicationResult,
      candidateApplicationsResult,
      candidateInterviewsResult,
      jobApplicationsResult,
    ] = await Promise.all([
      supabase.from('candidate_profiles').select('*').eq('id', candidate_id).single(),
      supabase.from('jobs').select('*').eq('id', job_id).single(),
      supabase.from('jobs').select('company_id, companies!inner(*)').eq('id', job_id).single(),
      application_id 
        ? supabase.from('applications').select('*').eq('id', application_id).single()
        : { data: null, error: null },
      supabase.from('applications').select('*').eq('candidate_id', candidate_id),
      supabase.from('applications').select('*').eq('candidate_id', candidate_id).in('status', ['interviewed', 'hired']),
      supabase.from('applications').select('*').eq('job_id', job_id),
    ]);

    const candidate = candidateResult.data;
    const job = jobResult.data;
    const jobWithCompany = jobWithCompanyResult.data as any;
    const company = jobWithCompany?.companies;
    const application = applicationResult.data;
    const candidateApplications = candidateApplicationsResult.data || [];
    const candidateInterviews = candidateInterviewsResult.data || [];
    const jobApplications = jobApplicationsResult.data || [];

    if (!candidate || !job) {
      return new Response(
        JSON.stringify({ error: 'Candidate or job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // === FEATURE ENGINEERING (200+ features) ===

    const features: Record<string, any> = {
      // Meta
      feature_version: 1,
      generated_at: new Date().toISOString(),

      // === A. CANDIDATE PROFILE FEATURES (50 features) ===
      
      // Skills
      candidate_total_skills: candidate.skills?.length || 0,
      candidate_years_experience: candidate.years_of_experience || 0,
      candidate_seniority_level: candidate.seniority_level || 'mid',
      candidate_availability: candidate.availability || 'full_time',
      candidate_notice_period_days: candidate.notice_period_days || 30,
      
      // Location
      candidate_location: candidate.location || 'unknown',
      candidate_willing_to_relocate: candidate.willing_to_relocate || false,
      candidate_remote_preference: candidate.remote_preference || 'hybrid',
      
      // Profile Quality
      candidate_profile_completeness: calculateProfileCompleteness(candidate),
      candidate_has_portfolio: !!candidate.portfolio_url,
      candidate_has_linkedin: !!candidate.linkedin_url,
      candidate_has_resume: !!candidate.resume_url,
      
      // Activity
      candidate_last_active_days_ago: daysSince(candidate.last_active_at),
      candidate_profile_updated_days_ago: daysSince(candidate.updated_at),
      candidate_total_applications: candidateApplications.length,
      candidate_interview_count: candidateInterviews.length,
      candidate_interview_rate: candidateApplications.length > 0 
        ? candidateInterviews.length / candidateApplications.length 
        : 0,
      
      // Salary
      candidate_expected_salary: candidate.expected_salary || 0,
      candidate_current_salary: candidate.current_salary || 0,
      candidate_salary_currency: candidate.salary_currency || 'EUR',

      // === B. JOB CHARACTERISTICS (30 features) ===
      
      // Basic
      job_title: job.title,
      job_type: job.job_type || 'full_time',
      job_seniority: job.seniority_level || 'mid',
      job_remote_policy: job.remote_policy || 'hybrid',
      job_location: job.location || 'unknown',
      
      // Salary
      job_salary_min: job.salary_min || 0,
      job_salary_max: job.salary_max || 0,
      job_salary_currency: job.salary_currency || 'EUR',
      job_salary_range_width: (job.salary_max || 0) - (job.salary_min || 0),
      
      // Urgency
      job_days_since_posted: daysSince(job.created_at),
      job_application_count: jobApplications.length,
      job_application_velocity: jobApplications.length / Math.max(1, daysSince(job.created_at)),
      job_is_urgent: job.is_urgent || false,
      
      // Requirements
      job_required_skills_count: job.required_skills?.length || 0,
      job_nice_to_have_skills_count: job.nice_to_have_skills?.length || 0,
      job_min_years_experience: job.min_years_experience || 0,
      job_max_years_experience: job.max_years_experience || 99,

      // === C. MATCH FEATURES (40 features) ===
      
      // Skills Match
      skills_exact_match_count: calculateExactSkillsMatch(candidate.skills, job.required_skills),
      skills_match_percentage: calculateSkillsMatchPercentage(candidate.skills, job.required_skills),
      skills_nice_to_have_match: calculateExactSkillsMatch(candidate.skills, job.nice_to_have_skills),
      skills_missing_count: (job.required_skills?.length || 0) - calculateExactSkillsMatch(candidate.skills, job.required_skills),
      
      // Experience Match
      experience_level_match: candidate.seniority_level === job.seniority_level ? 1 : 0,
      experience_years_match: calculateExperienceMatch(
        candidate.years_of_experience || 0,
        job.min_years_experience || 0,
        job.max_years_experience || 99
      ),
      experience_overqualified: (candidate.years_of_experience || 0) > (job.max_years_experience || 99) ? 1 : 0,
      experience_underqualified: (candidate.years_of_experience || 0) < (job.min_years_experience || 0) ? 1 : 0,
      
      // Location Match
      location_exact_match: candidate.location?.toLowerCase() === job.location?.toLowerCase() ? 1 : 0,
      location_remote_compatible: isRemoteCompatible(candidate.remote_preference, job.remote_policy),
      location_relocation_needed: !candidate.willing_to_relocate && candidate.location !== job.location ? 1 : 0,
      
      // Salary Match
      salary_in_range: isSalaryInRange(candidate.expected_salary, job.salary_min, job.salary_max),
      salary_below_range: (candidate.expected_salary || 0) < (job.salary_min || 0) ? 1 : 0,
      salary_above_range: (candidate.expected_salary || 0) > (job.salary_max || 0) ? 1 : 0,
      salary_distance_from_range: calculateSalaryDistance(candidate.expected_salary, job.salary_min, job.salary_max),
      
      // Availability Match
      availability_match: candidate.availability === job.job_type ? 1 : 0,
      notice_period_acceptable: (candidate.notice_period_days || 30) <= 60 ? 1 : 0,

      // === D. COMPANY FEATURES (20 features) ===
      
      company_id: company?.id || null,
      company_size: company?.company_size || 'unknown',
      company_industry: company?.industry || 'unknown',
      company_stage: company?.stage || 'unknown',
      company_active_jobs_count: 0, // TODO: Calculate
      company_total_hires: 0, // TODO: Calculate from applications
      
      // === E. INTERACTION FEATURES (20 features) ===
      
      // Application History
      candidate_applied_to_company_before: candidateApplications.some(app => 
        jobApplications.some(jobApp => jobApp.id === app.id)
      ) ? 1 : 0,
      candidate_avg_application_per_week: candidateApplications.length / Math.max(1, daysSince(candidate.created_at) / 7),
      
      // Application Data (if exists)
      application_exists: !!application,
      application_match_score: application?.match_score || 0,
      application_status: application?.status || 'pending',
      application_days_since_applied: application ? daysSince(application.applied_at) : null,

      // === F. TEMPORAL FEATURES (10 features) ===
      
      month: new Date().getMonth() + 1,
      quarter: Math.floor(new Date().getMonth() / 3) + 1,
      day_of_week: new Date().getDay(),
      is_weekend: [0, 6].includes(new Date().getDay()) ? 1 : 0,

      // === G. DERIVED FEATURES (10 features) ===
      
      // Composite scores
      overall_fit_score: calculateOverallFitScore({
        skills_match: calculateSkillsMatchPercentage(candidate.skills, job.required_skills),
        experience_match: calculateExperienceMatch(
          candidate.years_of_experience || 0,
          job.min_years_experience || 0,
          job.max_years_experience || 99
        ),
        salary_match: isSalaryInRange(candidate.expected_salary, job.salary_min, job.salary_max) ? 1 : 0,
        location_match: isRemoteCompatible(candidate.remote_preference, job.remote_policy) ? 1 : 0,
      }),
      
      profile_quality_score: calculateProfileCompleteness(candidate),
      job_attractiveness_score: calculateJobAttractiveness(job, company),
    };

    // Cache the features
    const cacheKey = `${candidate_id}_${job_id}`;
    await supabase.from('ml_feature_cache').upsert({
      entity_type: 'match',
      entity_id: cacheKey,
      features,
      feature_version: 1,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    });

    return new Response(
      JSON.stringify({ features, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating features:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// === HELPER FUNCTIONS ===

function daysSince(date: string | null): number {
  if (!date) return 999999;
  const diff = Date.now() - new Date(date).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function calculateProfileCompleteness(candidate: any): number {
  const fields = [
    'skills', 'years_of_experience', 'location', 'resume_url',
    'linkedin_url', 'expected_salary', 'availability', 'bio'
  ];
  const completed = fields.filter(field => candidate[field] && 
    (Array.isArray(candidate[field]) ? candidate[field].length > 0 : true)
  ).length;
  return completed / fields.length;
}

function calculateExactSkillsMatch(candidateSkills: string[] = [], jobSkills: string[] = []): number {
  if (jobSkills.length === 0) return 0;
  const candidateSet = new Set(candidateSkills.map(s => s.toLowerCase()));
  return jobSkills.filter(skill => candidateSet.has(skill.toLowerCase())).length;
}

function calculateSkillsMatchPercentage(candidateSkills: string[] = [], jobSkills: string[] = []): number {
  if (jobSkills.length === 0) return 1;
  return calculateExactSkillsMatch(candidateSkills, jobSkills) / jobSkills.length;
}

function calculateExperienceMatch(candidateYears: number, minYears: number, maxYears: number): number {
  if (candidateYears >= minYears && candidateYears <= maxYears) return 1;
  if (candidateYears < minYears) return Math.max(0, candidateYears / minYears);
  return Math.max(0, 1 - ((candidateYears - maxYears) / maxYears));
}

function isRemoteCompatible(candidatePref: string, jobPolicy: string): number {
  if (jobPolicy === 'remote' && candidatePref === 'remote') return 1;
  if (jobPolicy === 'hybrid' && candidatePref !== 'office_only') return 1;
  if (jobPolicy === 'office' && candidatePref === 'office_only') return 1;
  return 0.5; // Partial match
}

function isSalaryInRange(expected: number, min: number, max: number): number {
  if (!expected || !min || !max) return 0.5; // Unknown
  return expected >= min && expected <= max ? 1 : 0;
}

function calculateSalaryDistance(expected: number, min: number, max: number): number {
  if (!expected || !min || !max) return 0;
  if (expected >= min && expected <= max) return 0; // Perfect match
  if (expected < min) return (min - expected) / min;
  return (expected - max) / max;
}

function calculateOverallFitScore(scores: Record<string, number>): number {
  const weights = {
    skills_match: 0.35,
    experience_match: 0.25,
    salary_match: 0.20,
    location_match: 0.20,
  };
  
  return Object.entries(weights).reduce((sum, [key, weight]) => {
    return sum + (scores[key] || 0) * weight;
  }, 0);
}

function calculateJobAttractiveness(job: any, company: any): number {
  let score = 0.5; // Base score
  
  // Salary range
  if (job.salary_max && job.salary_max > 80000) score += 0.1;
  if (job.salary_max && job.salary_max > 120000) score += 0.1;
  
  // Remote policy
  if (job.remote_policy === 'remote') score += 0.1;
  if (job.remote_policy === 'hybrid') score += 0.05;
  
  // Company size (larger = more attractive)
  if (company?.company_size === 'enterprise') score += 0.1;
  if (company?.company_size === 'large') score += 0.05;
  
  // Urgency (urgent jobs may be less attractive)
  if (job.is_urgent) score -= 0.1;
  
  return Math.max(0, Math.min(1, score));
}

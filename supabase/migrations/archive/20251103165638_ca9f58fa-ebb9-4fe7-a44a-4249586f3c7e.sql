-- Fix CRITICAL: Security Definer Views
-- Set security_invoker=true to enforce RLS on querying user, not view creator

-- Fix unified_candidate_view (critical for candidate data protection)
DROP VIEW IF EXISTS public.unified_candidate_view;
CREATE VIEW public.unified_candidate_view 
WITH (security_invoker=true) AS
SELECT 
  cp.id,
  cp.user_id,
  cp.email,
  cp.full_name,
  cp.phone,
  cp.linkedin_url,
  cp.current_title,
  cp.current_company,
  cp.years_of_experience,
  cp.notice_period,
  cp.preferred_currency,
  cp.current_salary_min,
  cp.current_salary_max,
  cp.desired_salary_min,
  cp.desired_salary_max,
  cp.work_authorization,
  cp.desired_locations,
  cp.remote_preference,
  cp.skills,
  cp.gdpr_consent,
  cp.blocked_companies,
  cp.last_activity_at,
  cp.created_at,
  cp.updated_at,
  cp.merged_at,
  p.full_name as profile_full_name,
  p.avatar_url,
  p.profile_slug,
  COUNT(DISTINCT a.id) as total_applications,
  COUNT(DISTINCT d.id) as total_documents,
  COUNT(DISTINCT ci.id) FILTER (WHERE ci.interaction_type = 'profile_view') as profile_views,
  MAX(a.applied_at) as last_application_date,
  MAX(ci.created_at) as last_interaction_date
FROM public.candidate_profiles cp
LEFT JOIN public.profiles p ON cp.user_id = p.id
LEFT JOIN public.applications a ON (a.candidate_id = cp.id OR (cp.user_id IS NOT NULL AND a.user_id = cp.user_id))
LEFT JOIN public.candidate_documents d ON d.candidate_id = cp.id
LEFT JOIN public.candidate_interactions ci ON ci.candidate_id = cp.id
GROUP BY 
  cp.id, cp.user_id, cp.email, cp.full_name, cp.phone,
  cp.linkedin_url, cp.current_title, cp.years_of_experience,
  cp.notice_period, cp.preferred_currency, cp.current_salary_min,
  cp.current_salary_max, cp.desired_salary_min, cp.desired_salary_max,
  cp.work_authorization, cp.desired_locations, cp.remote_preference,
  cp.skills, cp.gdpr_consent, cp.blocked_companies,
  cp.last_activity_at, cp.created_at, cp.updated_at, cp.merged_at,
  p.full_name, p.avatar_url, p.profile_slug;

-- Fix public_profiles view
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles 
WITH (security_invoker=true) AS
SELECT 
  id,
  full_name,
  avatar_url,
  profile_slug,
  created_at
FROM public.profiles;

-- Fix public_talent_strategists view
DROP VIEW IF EXISTS public.public_talent_strategists;
CREATE VIEW public.public_talent_strategists 
WITH (security_invoker=true) AS
SELECT 
  ts.id,
  ts.specialties,
  ts.created_at,
  ts.full_name,
  ts.title,
  ts.email,
  ts.phone,
  ts.linkedin_url,
  ts.photo_url,
  ts.availability
FROM public.talent_strategists ts
WHERE ts.availability IS NOT NULL;

-- Move extensions from public schema to extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;

-- Create rate limiting table for AI endpoints
CREATE TABLE IF NOT EXISTS public.ai_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(ip_address, endpoint, window_start)
);

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_ai_rate_limits_lookup 
ON public.ai_rate_limits(ip_address, endpoint, window_start);

-- Enable RLS on rate limits table
ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage rate limits
CREATE POLICY "Service role can manage rate limits"
ON public.ai_rate_limits
FOR ALL
USING (true)
WITH CHECK (true);
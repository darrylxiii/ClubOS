-- Security Fix: Add candidate profile contact method constraint
-- Ensures all candidates have at least one way to be contacted

ALTER TABLE public.candidate_profiles
ADD CONSTRAINT candidate_must_have_contact_method
CHECK (
  (email IS NOT NULL AND email != '') 
  OR (phone IS NOT NULL AND phone != '')
  OR (linkedin_url IS NOT NULL AND linkedin_url != '')
  OR (user_id IS NOT NULL)
);

-- Security Fix: Convert security definer views to security invoker
-- This ensures views respect RLS policies of the querying user, not the creator

-- Recreate public_profiles view with security invoker
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true)
AS
SELECT 
  id,
  full_name,
  avatar_url,
  profile_slug,
  created_at
FROM profiles;

-- Recreate public_talent_strategists view with security invoker
CREATE OR REPLACE VIEW public.public_talent_strategists
WITH (security_invoker = true)
AS
SELECT 
  id,
  specialties,
  created_at,
  full_name,
  title,
  email,
  phone,
  linkedin_url,
  photo_url,
  availability
FROM talent_strategists ts
WHERE availability IS NOT NULL;

-- Recreate unified_candidate_view with security invoker
CREATE OR REPLACE VIEW public.unified_candidate_view
WITH (security_invoker = true)
AS
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
  p.full_name AS profile_full_name,
  p.avatar_url,
  p.profile_slug,
  COUNT(DISTINCT a.id) AS total_applications,
  COUNT(DISTINCT d.id) AS total_documents,
  COUNT(DISTINCT ci.id) FILTER (WHERE ci.interaction_type = 'profile_view') AS profile_views,
  MAX(a.applied_at) AS last_application_date,
  MAX(ci.created_at) AS last_interaction_date
FROM candidate_profiles cp
LEFT JOIN profiles p ON cp.user_id = p.id
LEFT JOIN applications a ON (a.candidate_id = cp.id OR (cp.user_id IS NOT NULL AND a.user_id = cp.user_id))
LEFT JOIN candidate_documents d ON d.candidate_id = cp.id
LEFT JOIN candidate_interactions ci ON ci.candidate_id = cp.id
GROUP BY 
  cp.id, cp.user_id, cp.email, cp.full_name, cp.phone, cp.linkedin_url, 
  cp.current_title, cp.years_of_experience, cp.notice_period, cp.preferred_currency, 
  cp.current_salary_min, cp.current_salary_max, cp.desired_salary_min, cp.desired_salary_max, 
  cp.work_authorization, cp.desired_locations, cp.remote_preference, cp.skills, 
  cp.gdpr_consent, cp.blocked_companies, cp.last_activity_at, cp.created_at, 
  cp.updated_at, cp.merged_at, p.full_name, p.avatar_url, p.profile_slug;
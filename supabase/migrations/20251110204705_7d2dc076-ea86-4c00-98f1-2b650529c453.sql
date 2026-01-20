-- Explicitly set security_invoker=true on views without explicit setting
-- This ensures they use SECURITY INVOKER (respecting RLS) instead of SECURITY DEFINER

-- Fix public_talent_strategists view (currently has NULL options)
DROP VIEW IF EXISTS public.public_talent_strategists;
CREATE VIEW public.public_talent_strategists
WITH (security_invoker=true)
AS
SELECT 
  id,
  full_name,
  title,
  bio,
  specialties,
  availability,
  photo_url,
  created_at,
  updated_at
FROM public.talent_strategists;

GRANT SELECT ON public.public_talent_strategists TO authenticated, anon;
COMMENT ON VIEW public.public_talent_strategists IS 
  'Public view exposing safe talent strategist fields. Uses SECURITY INVOKER (respects RLS).';

-- Fix potential_merges view (currently has NULL options)
DROP VIEW IF EXISTS public.potential_merges;
CREATE VIEW public.potential_merges
WITH (security_invoker=true)
AS
SELECT 
  cp.id as candidate_id,
  cp.full_name as candidate_name,
  cp.email as candidate_email,
  cp.user_id as linked_user_id,
  cp.invitation_status,
  cp.profile_completeness as candidate_completeness,
  cp.created_at as candidate_created_at,
  p.id as profile_id,
  p.full_name as profile_name,
  p.email as profile_email,
  p.created_at as profile_created_at,
  CASE
    WHEN cp.user_id IS NOT NULL AND cp.invitation_status != 'registered' THEN 'partial_link'
    WHEN LOWER(cp.email) = LOWER(p.email) AND cp.user_id IS NULL THEN 'email_match'
    WHEN calculate_name_similarity(cp.full_name, p.full_name) >= 95 THEN 'name_match'
    ELSE 'manual'
  END as match_type,
  CASE
    WHEN cp.user_id = p.id AND cp.invitation_status != 'registered' THEN 95
    WHEN LOWER(cp.email) = LOWER(p.email) THEN 90
    WHEN calculate_name_similarity(cp.full_name, p.full_name) = 100 THEN 85
    WHEN calculate_name_similarity(cp.full_name, p.full_name) >= 95 THEN 75
    ELSE 50
  END as confidence_score,
  EXISTS(
    SELECT 1 FROM candidate_merge_log
    WHERE candidate_merge_log.candidate_id = cp.id
      AND candidate_merge_log.profile_id = p.id
      AND candidate_merge_log.merge_status = 'completed'
  ) as already_merged
FROM candidate_profiles cp
JOIN profiles p ON (
  LOWER(cp.email) = LOWER(p.email)
  OR cp.user_id = p.id
  OR calculate_name_similarity(cp.full_name, p.full_name) >= 95
)
WHERE (cp.invitation_status IS NULL OR cp.invitation_status != 'registered')
  AND cp.merged_at IS NULL
  AND NOT EXISTS(
    SELECT 1 FROM candidate_merge_log
    WHERE candidate_merge_log.candidate_id = cp.id
      AND candidate_merge_log.profile_id = p.id
      AND candidate_merge_log.merge_status = 'completed'
  );

COMMENT ON VIEW public.potential_merges IS 
  'View for identifying potential candidate profile merges. Uses SECURITY INVOKER (respects RLS).';
-- Security Fix: Convert potential_merges view to security invoker
-- This ensures the view respects RLS policies of the querying user

CREATE OR REPLACE VIEW public.potential_merges
WITH (security_invoker = true)
AS
SELECT 
  cp.id AS candidate_id,
  cp.full_name AS candidate_name,
  cp.email AS candidate_email,
  cp.user_id AS linked_user_id,
  cp.invitation_status,
  cp.profile_completeness AS candidate_completeness,
  cp.created_at AS candidate_created_at,
  p.id AS profile_id,
  p.full_name AS profile_name,
  p.email AS profile_email,
  p.created_at AS profile_created_at,
  CASE
    WHEN cp.user_id IS NOT NULL AND cp.invitation_status <> 'registered' THEN 'partial_link'
    WHEN lower(cp.email) = lower(p.email) AND cp.user_id IS NULL THEN 'email_match'
    ELSE 'manual'
  END AS match_type,
  CASE
    WHEN cp.user_id = p.id AND cp.invitation_status <> 'registered' THEN 95
    WHEN lower(cp.email) = lower(p.email) THEN 90
    ELSE 50
  END AS confidence_score,
  EXISTS (
    SELECT 1
    FROM candidate_merge_log
    WHERE candidate_merge_log.candidate_id = cp.id 
      AND candidate_merge_log.profile_id = p.id 
      AND candidate_merge_log.merge_status = 'completed'
  ) AS already_merged
FROM candidate_profiles cp
JOIN profiles p ON lower(cp.email) = lower(p.email) OR cp.user_id = p.id
WHERE (cp.invitation_status IS NULL OR cp.invitation_status <> 'registered') 
  AND cp.merged_at IS NULL
ORDER BY 
  CASE
    WHEN cp.user_id = p.id AND cp.invitation_status <> 'registered' THEN 95
    WHEN lower(cp.email) = lower(p.email) THEN 90
    ELSE 50
  END DESC, 
  cp.created_at DESC;
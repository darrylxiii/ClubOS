-- Add function for fuzzy name matching to detect candidates with similar names but different emails
CREATE OR REPLACE FUNCTION calculate_name_similarity(name1 TEXT, name2 TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  similarity_score INTEGER;
BEGIN
  -- Simple similarity scoring based on name patterns
  similarity_score := CASE
    WHEN LOWER(TRIM(name1)) = LOWER(TRIM(name2)) THEN 100
    WHEN LOWER(REPLACE(name1, ' ', '')) = LOWER(REPLACE(name2, ' ', '')) THEN 95
    WHEN LOWER(name1) LIKE LOWER(name2) || '%' OR LOWER(name2) LIKE LOWER(name1) || '%' THEN 80
    ELSE 0
  END;
  
  RETURN similarity_score;
END;
$$;

-- Update potential_merges view to include name-based matching
CREATE OR REPLACE VIEW potential_merges AS
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
    WHERE candidate_id = cp.id 
    AND profile_id = p.id 
    AND merge_status = 'completed'
  ) as already_merged
FROM candidate_profiles cp
INNER JOIN profiles p ON (
  LOWER(cp.email) = LOWER(p.email) 
  OR cp.user_id = p.id
  OR calculate_name_similarity(cp.full_name, p.full_name) >= 95
)
WHERE (cp.invitation_status IS NULL OR cp.invitation_status != 'registered')
  AND cp.merged_at IS NULL
  AND NOT EXISTS(
    SELECT 1 FROM candidate_merge_log 
    WHERE candidate_id = cp.id 
    AND profile_id = p.id 
    AND merge_status = 'completed'
  );

GRANT SELECT ON potential_merges TO authenticated;
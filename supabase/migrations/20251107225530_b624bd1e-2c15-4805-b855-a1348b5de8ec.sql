-- Create candidate_merge_log table for audit trail
CREATE TABLE IF NOT EXISTS candidate_merge_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES candidate_profiles(id) ON DELETE SET NULL,
  profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  merged_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  merge_type text NOT NULL CHECK (merge_type IN ('auto', 'manual', 'invitation')),
  merged_fields jsonb DEFAULT '{}'::jsonb,
  merge_status text NOT NULL DEFAULT 'pending' CHECK (merge_status IN ('pending', 'completed', 'failed', 'reverted')),
  error_message text,
  confidence_score integer,
  match_type text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Add index for performance
CREATE INDEX idx_merge_log_candidate ON candidate_merge_log(candidate_id);
CREATE INDEX idx_merge_log_profile ON candidate_merge_log(profile_id);
CREATE INDEX idx_merge_log_status ON candidate_merge_log(merge_status);
CREATE INDEX idx_merge_log_created ON candidate_merge_log(created_at DESC);

-- Create potential_merges view for auto-detection
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
    ELSE 'manual'
  END as match_type,
  CASE 
    WHEN cp.user_id = p.id AND cp.invitation_status != 'registered' THEN 95
    WHEN LOWER(cp.email) = LOWER(p.email) THEN 90
    ELSE 50
  END as confidence_score,
  -- Check if already merged
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
)
WHERE (cp.invitation_status IS NULL OR cp.invitation_status != 'registered')
  AND cp.merged_at IS NULL
ORDER BY confidence_score DESC, cp.created_at DESC;

-- RLS Policies for candidate_merge_log
ALTER TABLE candidate_merge_log ENABLE ROW LEVEL SECURITY;

-- Admins can view all merge logs
CREATE POLICY "Admins can view merge logs"
ON candidate_merge_log
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Admins can insert merge logs
CREATE POLICY "Admins can create merge logs"
ON candidate_merge_log
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Admins can update merge logs
CREATE POLICY "Admins can update merge logs"
ON candidate_merge_log
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Service role can manage all (for edge functions)
CREATE POLICY "Service role full access to merge logs"
ON candidate_merge_log
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Grant access to view
GRANT SELECT ON potential_merges TO authenticated;

COMMENT ON TABLE candidate_merge_log IS 'Audit log for all candidate profile merge operations';
COMMENT ON VIEW potential_merges IS 'Auto-detected potential merges between candidate_profiles and profiles based on email matching and partial links';
-- Add soft delete and audit columns to candidate_profiles
ALTER TABLE candidate_profiles
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS deletion_reason TEXT NULL,
ADD COLUMN IF NOT EXISTS deletion_type TEXT CHECK (deletion_type IN ('soft', 'hard')) NULL,
ADD COLUMN IF NOT EXISTS deletion_metadata JSONB DEFAULT '{}'::jsonb;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_deleted_at 
ON candidate_profiles(deleted_at) 
WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_candidate_profiles_active 
ON candidate_profiles(id) 
WHERE deleted_at IS NULL;

-- Create comprehensive audit table
CREATE TABLE IF NOT EXISTS candidate_profile_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'soft_delete', 'hard_delete', 'restore')),
  performed_by UUID NOT NULL REFERENCES profiles(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  before_data JSONB NULL,
  after_data JSONB NULL,
  changed_fields TEXT[] NULL,
  
  reason TEXT NULL,
  ip_address INET NULL,
  user_agent TEXT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  is_bulk_action BOOLEAN DEFAULT false,
  bulk_action_id UUID NULL
);

-- Create indexes for audit table
CREATE INDEX IF NOT EXISTS idx_candidate_audit_candidate ON candidate_profile_audit(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_audit_action ON candidate_profile_audit(action);
CREATE INDEX IF NOT EXISTS idx_candidate_audit_performed_at ON candidate_profile_audit(performed_at DESC);

-- Create view for applications with deleted candidate tracking
CREATE OR REPLACE VIEW applications_with_deleted_candidates AS
SELECT 
  a.*,
  c.deleted_at as candidate_deleted_at,
  c.deletion_type as candidate_deletion_type,
  CASE 
    WHEN c.deleted_at IS NULL THEN 'active'
    WHEN c.deleted_at IS NOT NULL THEN 'archived'
    WHEN a.candidate_id IS NULL THEN 'removed'
  END as candidate_status
FROM applications a
LEFT JOIN candidate_profiles c ON c.id = a.candidate_id;

-- Create view for accurate rejection stats
CREATE OR REPLACE VIEW rejection_stats_view AS
SELECT 
  job_id,
  COUNT(*) FILTER (WHERE status = 'rejected' AND candidate_id IS NOT NULL) as rejection_count,
  COUNT(*) FILTER (WHERE status = 'active' AND candidate_id IS NOT NULL) as active_count,
  COUNT(*) FILTER (WHERE status = 'hired' AND candidate_id IS NOT NULL) as hired_count,
  COUNT(*) FILTER (WHERE candidate_id IS NOT NULL) as total_valid_applications,
  COUNT(*) FILTER (WHERE candidate_id IS NULL) as orphaned_applications
FROM applications
GROUP BY job_id;

-- Enable RLS on audit table
ALTER TABLE candidate_profile_audit ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view audit logs for their own candidates
CREATE POLICY "Users can view audit logs"
ON candidate_profile_audit FOR SELECT
TO authenticated
USING (true);

-- Authenticated users can insert audit logs
CREATE POLICY "Users can insert audit logs"
ON candidate_profile_audit FOR INSERT
TO authenticated
WITH CHECK (performed_by = auth.uid());
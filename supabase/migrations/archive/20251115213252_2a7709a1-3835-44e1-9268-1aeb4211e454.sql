-- Phase 1: Add account approval status columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS account_status text DEFAULT 'pending' CHECK (account_status IN ('pending', 'approved', 'declined')),
ADD COLUMN IF NOT EXISTS account_approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS account_approved_by uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS account_decline_reason text,
ADD COLUMN IF NOT EXISTS account_reviewed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS assigned_strategist_id uuid REFERENCES profiles(id) DEFAULT '8b762c96-5dcf-41c8-9e1e-bbf18c18c3c5';

-- Add index for admin dashboard queries
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON profiles(account_status, created_at DESC);

-- Approve all existing users (grandfather them in)
UPDATE profiles 
SET 
  account_status = 'approved', 
  account_approved_at = created_at,
  assigned_strategist_id = '8b762c96-5dcf-41c8-9e1e-bbf18c18c3c5'
WHERE account_status = 'pending' OR account_status IS NULL;

-- Update partner_requests table to support approval workflow
ALTER TABLE partner_requests
ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS decline_reason text;

-- Set default assigned_to to Darryl for existing requests
UPDATE partner_requests 
SET assigned_to = '8b762c96-5dcf-41c8-9e1e-bbf18c18c3c5'
WHERE assigned_to IS NULL;

-- Update status check constraint to include approved and declined
ALTER TABLE partner_requests 
DROP CONSTRAINT IF EXISTS partner_requests_status_check;

ALTER TABLE partner_requests 
ADD CONSTRAINT partner_requests_status_check 
CHECK (status IN ('pending', 'approved', 'declined', 'in_progress', 'completed'));

-- Create unified view that combines candidate and partner requests
CREATE OR REPLACE VIEW member_requests_unified AS
-- Candidate requests
SELECT 
  p.id,
  'candidate' as request_type,
  p.full_name as name,
  p.email,
  p.phone,
  p.current_title as title_or_company,
  p.location,
  p.desired_salary_min,
  p.desired_salary_max,
  p.resume_url,
  p.linkedin_url,
  p.account_status as status,
  p.created_at,
  p.account_reviewed_at as reviewed_at,
  p.account_approved_by as reviewed_by,
  p.account_decline_reason as decline_reason,
  p.assigned_strategist_id as assigned_to,
  NULL::jsonb as additional_data
FROM profiles p
WHERE p.created_at > '2025-01-01'

UNION ALL

-- Partner requests  
SELECT
  pr.id,
  'partner' as request_type,
  pr.contact_name as name,
  pr.contact_email as email,
  pr.contact_phone as phone,
  pr.company_name as title_or_company,
  pr.headquarters_location as location,
  NULL::integer as desired_salary_min,
  NULL::integer as desired_salary_max,
  NULL as resume_url,
  pr.linkedin_url,
  pr.status,
  pr.created_at,
  pr.reviewed_at,
  pr.reviewed_by,
  pr.decline_reason,
  pr.assigned_to,
  jsonb_build_object(
    'company_size', pr.company_size,
    'industry', pr.industry,
    'budget_range', pr.budget_range,
    'estimated_roles_per_year', pr.estimated_roles_per_year,
    'website', pr.website
  ) as additional_data
FROM partner_requests pr;

-- Add comments for documentation
COMMENT ON COLUMN profiles.account_status IS 'Account approval status: pending (awaiting admin review), approved (can access platform), declined (rejected application)';
COMMENT ON COLUMN profiles.assigned_strategist_id IS 'Strategist assigned to handle this candidate (defaults to Darryl)';
COMMENT ON COLUMN partner_requests.reviewed_by IS 'Admin who reviewed this partner request';
COMMENT ON VIEW member_requests_unified IS 'Unified view combining candidate and partner requests for admin dashboard';
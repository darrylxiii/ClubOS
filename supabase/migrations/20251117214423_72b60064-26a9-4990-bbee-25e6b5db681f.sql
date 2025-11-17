-- Drop the problematic constraint
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS check_approval_requires_onboarding;

-- Create function to check if user is a pure candidate (no elevated roles)
CREATE OR REPLACE FUNCTION public.is_pure_candidate(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- User is a pure candidate if they don't have admin, partner, or strategist roles
  SELECT NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = check_user_id
    AND role IN ('admin', 'partner', 'strategist')
  );
$$;

-- New smart constraint: only require onboarding for pure candidates
ALTER TABLE profiles 
ADD CONSTRAINT check_approval_requires_onboarding_for_candidates
CHECK (
  account_status != 'approved'
  OR
  -- If approved, either they're NOT a pure candidate OR they completed onboarding
  (
    account_status = 'approved' AND (
      NOT is_pure_candidate(id)
      OR 
      (is_pure_candidate(id) AND onboarding_completed_at IS NOT NULL AND phone_verified = true)
    )
  )
);

-- Immediately restore access for all admins, partners, strategists
UPDATE profiles
SET 
  account_status = 'approved',
  account_approved_by = '8b762c96-5dcf-41c8-9e1e-bbf18c18c3c5',
  account_reviewed_at = NOW()
WHERE id IN (
  SELECT DISTINCT user_id 
  FROM user_roles 
  WHERE role IN ('admin', 'partner', 'strategist')
)
AND account_status = 'pending';
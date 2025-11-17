-- Add onboarding tracking columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_current_step INTEGER DEFAULT 0 CHECK (onboarding_current_step >= 0 AND onboarding_current_step <= 6),
ADD COLUMN IF NOT EXISTS onboarding_partial_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS onboarding_last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_step 
ON profiles(onboarding_current_step) 
WHERE onboarding_completed_at IS NULL;

-- FIRST: Update existing approved users without onboarding back to pending
UPDATE profiles
SET 
  account_status = 'pending',
  account_approved_by = NULL,
  account_reviewed_at = NULL
WHERE 
  account_status = 'approved' 
  AND (onboarding_completed_at IS NULL OR phone_verified = false);

-- THEN: Add constraint (now all data is valid)
ALTER TABLE profiles 
ADD CONSTRAINT check_approval_requires_onboarding 
CHECK (
  account_status != 'approved' 
  OR 
  (account_status = 'approved' AND onboarding_completed_at IS NOT NULL AND phone_verified = true)
);

COMMENT ON COLUMN profiles.onboarding_current_step IS 'Current step in onboarding (0=not started, 1-6=in progress)';
COMMENT ON COLUMN profiles.onboarding_partial_data IS 'Stores partial form data as user progresses through onboarding';
COMMENT ON COLUMN profiles.onboarding_last_activity_at IS 'Last time user interacted with onboarding';
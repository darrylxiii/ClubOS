-- Add missing onboarding_completed_at column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Add helpful comment
COMMENT ON COLUMN profiles.onboarding_completed_at IS 
  'Timestamp when user completed initial onboarding process';

-- Create index for queries filtering by onboarding status
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed 
ON profiles(onboarding_completed_at) 
WHERE onboarding_completed_at IS NOT NULL;

-- Backfill existing users who clearly completed onboarding
-- (users with resume_url, current_title, and desired_salary indicate completion)
UPDATE profiles
SET onboarding_completed_at = created_at
WHERE onboarding_completed_at IS NULL
  AND resume_url IS NOT NULL
  AND current_title IS NOT NULL
  AND desired_salary_min IS NOT NULL;
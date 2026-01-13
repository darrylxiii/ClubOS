-- Remove blocking constraints for manual candidate addition
-- Step 1: Drop the constraint that requires user_id OR email
ALTER TABLE public.candidate_profiles 
DROP CONSTRAINT IF EXISTS candidate_profiles_user_or_email_check;

-- Step 2: Make email unique only when provided (partial unique index)
-- First drop the existing unique constraint
ALTER TABLE public.candidate_profiles 
DROP CONSTRAINT IF EXISTS unique_email;

-- Create a partial unique index that only applies when email is not null/empty
CREATE UNIQUE INDEX IF NOT EXISTS unique_email_when_present 
ON public.candidate_profiles (email) 
WHERE email IS NOT NULL AND email != '';

-- Add comment explaining the new approach
COMMENT ON INDEX unique_email_when_present IS 'Ensures email uniqueness only when an email is provided, allowing multiple NULL emails for manually-added candidates';
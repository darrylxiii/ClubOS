-- Make user_id nullable in phone_verifications to support unauthenticated verification
-- This is needed for candidate onboarding before account creation

ALTER TABLE phone_verifications 
ALTER COLUMN user_id DROP NOT NULL;

-- Add a check constraint to ensure either user_id is present OR phone is verified
-- This maintains data integrity while allowing pre-signup verification
ALTER TABLE phone_verifications
ADD CONSTRAINT phone_verifications_user_or_phone_check
CHECK (
  user_id IS NOT NULL OR 
  (user_id IS NULL AND phone IS NOT NULL)
);

-- Add index for better query performance on unauthenticated lookups
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone_unauthenticated 
ON phone_verifications(phone, code) 
WHERE user_id IS NULL AND verified_at IS NULL;
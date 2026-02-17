
-- Step 1: Add validated_by column to distinguish validated tokens from invalidated ones
ALTER TABLE public.password_reset_tokens 
ADD COLUMN IF NOT EXISTS validated_by TEXT DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.password_reset_tokens.validated_by IS 'How this token was validated: otp, magic_link, or invalidated. NULL = not yet validated.';

-- Step 2: Add index on password_history(user_id) for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON public.password_history(user_id);

-- Step 3: Drop the OTP plaintext index since we will hash OTPs
DROP INDEX IF EXISTS idx_password_reset_otp;

-- Step 4: Schedule daily cleanup of expired tokens (requires pg_cron + pg_net)
-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

SELECT cron.schedule(
  'cleanup-expired-password-resets',
  '0 3 * * *',
  'SELECT cleanup_expired_password_resets()'
);

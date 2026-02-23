
-- Phase 1: Make code columns nullable, add resend_id, redact existing plaintext codes
-- Make code column nullable on both verification tables
ALTER TABLE public.email_verifications ALTER COLUMN code DROP NOT NULL;
ALTER TABLE public.phone_verifications ALTER COLUMN code DROP NOT NULL;

-- Add resend_id column to email_verifications for delivery tracking
ALTER TABLE public.email_verifications ADD COLUMN IF NOT EXISTS resend_id text;

-- Redact all existing plaintext codes that already have a hash
UPDATE public.email_verifications SET code = 'REDACTED' WHERE code_hash IS NOT NULL AND code != 'REDACTED';
UPDATE public.phone_verifications SET code = 'REDACTED' WHERE code_hash IS NOT NULL AND code != 'REDACTED';

-- Create scheduled cleanup function for expired codes and rate limit records
CREATE OR REPLACE FUNCTION public.cleanup_expired_verifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Redact plaintext codes older than 1 hour
  UPDATE email_verifications SET code = 'REDACTED' WHERE code != 'REDACTED' AND code IS NOT NULL AND created_at < now() - interval '1 hour';
  UPDATE phone_verifications SET code = 'REDACTED' WHERE code != 'REDACTED' AND code IS NOT NULL AND created_at < now() - interval '1 hour';

  -- Delete rate limit records older than 24 hours
  DELETE FROM verification_ip_rate_limits WHERE window_start < now() - interval '24 hours';

  -- Delete verification records older than 90 days
  DELETE FROM email_verifications WHERE created_at < now() - interval '90 days';
  DELETE FROM phone_verifications WHERE created_at < now() - interval '90 days';

  RAISE LOG 'cleanup_expired_verifications: completed successfully';
END;
$$;

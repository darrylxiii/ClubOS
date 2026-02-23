
-- Add Twilio delivery tracking columns to phone_verifications
ALTER TABLE public.phone_verifications
  ADD COLUMN IF NOT EXISTS twilio_sid text,
  ADD COLUMN IF NOT EXISTS twilio_status text,
  ADD COLUMN IF NOT EXISTS twilio_error_code text;

-- Add code_hash column to both verification tables for hashed OTP storage
ALTER TABLE public.email_verifications
  ADD COLUMN IF NOT EXISTS code_hash text;

ALTER TABLE public.phone_verifications
  ADD COLUMN IF NOT EXISTS code_hash text;

-- Create IP-based rate limit table for unauthenticated verification requests
CREATE TABLE IF NOT EXISTS public.verification_ip_rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address text NOT NULL,
  identifier text NOT NULL, -- email or phone number
  verification_type text NOT NULL CHECK (verification_type IN ('email', 'phone')),
  attempt_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_verification_ip_rate_limits_lookup
  ON public.verification_ip_rate_limits (ip_address, identifier, verification_type, window_start);

-- Enable RLS
ALTER TABLE public.verification_ip_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (edge functions use service role)
CREATE POLICY "Service role only" ON public.verification_ip_rate_limits
  FOR ALL USING (false);

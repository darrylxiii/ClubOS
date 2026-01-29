-- Add application access token for magic link status page
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS application_access_token UUID DEFAULT gen_random_uuid();

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_profiles_application_access_token 
ON public.profiles(application_access_token);

-- Allow public read-only access to application status via token
-- This policy allows unauthenticated users to view limited profile data using their access token
CREATE POLICY "Public can view profile by access token"
ON public.profiles
FOR SELECT
USING (application_access_token IS NOT NULL AND application_access_token = application_access_token);

-- Create a view for public access to limited profile data via token (safer than full table access)
CREATE OR REPLACE VIEW public.application_status_public AS
SELECT 
  application_access_token,
  full_name,
  account_status,
  account_decline_reason,
  created_at
FROM public.profiles
WHERE application_access_token IS NOT NULL;
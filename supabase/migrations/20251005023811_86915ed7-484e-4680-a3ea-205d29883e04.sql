-- Phase 4: Secure Profiles Table - Create public view without PII
-- This view exposes only non-sensitive profile information for display purposes

CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  p.id,
  p.full_name,
  p.avatar_url,
  p.current_title,
  p.location,
  p.linkedin_url,
  p.twitter_username,
  p.github_username,
  p.instagram_username,
  p.remote_work_preference,
  p.employment_type_preference,
  p.created_at
FROM public.profiles p
WHERE p.stealth_mode_enabled = false OR p.stealth_mode_enabled IS NULL;

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;

-- Note: This view does NOT expose PII or sensitive data:
-- - email (PII - excluded)
-- - phone (PII - excluded)
-- - salary information (sensitive - excluded)
-- - resume_url (PII - excluded)
-- - blocked_companies (sensitive - excluded)
-- - privacy_settings (sensitive - excluded)
-- - *_profile_data fields (PII - excluded)
-- Only profiles with stealth mode disabled are visible
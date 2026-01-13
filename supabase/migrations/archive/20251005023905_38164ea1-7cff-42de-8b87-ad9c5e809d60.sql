-- Fix Security Definer Views
-- Views should use SECURITY INVOKER to enforce RLS of the querying user

-- Drop and recreate public_talent_strategists with SECURITY INVOKER
DROP VIEW IF EXISTS public.public_talent_strategists;

CREATE VIEW public.public_talent_strategists 
WITH (security_invoker = true)
AS
SELECT 
  ts.id,
  ts.full_name,
  ts.title,
  ts.bio,
  ts.photo_url,
  ts.specialties,
  ts.availability,
  ts.linkedin_url,
  ts.twitter_url,
  ts.instagram_url
FROM public.talent_strategists ts;

GRANT SELECT ON public.public_talent_strategists TO authenticated;

-- Drop and recreate public_profiles with SECURITY INVOKER
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = true)
AS
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

GRANT SELECT ON public.public_profiles TO authenticated;

-- Note: SECURITY INVOKER ensures views respect RLS policies of the querying user
-- This prevents privilege escalation through views
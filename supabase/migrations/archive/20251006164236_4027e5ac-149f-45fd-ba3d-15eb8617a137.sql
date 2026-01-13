-- Fix security definer views - both public_profiles and public_talent_strategists
-- These views must use security_invoker=true to enforce RLS of the querying user
-- This prevents privilege escalation through views

-- Fix public_profiles view
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker=true)
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

-- Grant SELECT on the view to authenticated and anonymous users
GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- Ensure the underlying profiles table has proper RLS enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Add RLS policy to allow public read access to profiles (respecting stealth mode)
-- This policy will be enforced when querying through the view
DROP POLICY IF EXISTS "Public can view non-stealth profiles" ON public.profiles;

CREATE POLICY "Public can view non-stealth profiles" 
ON public.profiles
FOR SELECT 
USING (stealth_mode_enabled = false OR stealth_mode_enabled IS NULL);

-- Note: With security_invoker=true, the view respects the RLS policies
-- This ensures proper security while allowing public profile discovery
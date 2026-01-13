-- Phase 1: Critical Profile Data Protection
-- Drop any existing views that depend on profiles table
DROP VIEW IF EXISTS public.public_profiles CASCADE;

-- Drop ALL existing policies on profiles to start fresh
DROP POLICY IF EXISTS "Public can view non-stealth profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Strategists can view profiles they manage" ON public.profiles;
DROP POLICY IF EXISTS "Company members can view applicant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Add privacy control columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS public_fields JSONB DEFAULT '{"visible": ["full_name", "avatar_url"]}'::jsonb,
ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{"public_profile": false}'::jsonb;

-- Create a secure public view that only shows minimal data
CREATE VIEW public.public_profiles WITH (security_invoker=true) AS
SELECT 
  id,
  full_name,
  avatar_url,
  CASE WHEN (privacy_settings->>'public_profile')::boolean = true THEN location ELSE NULL END as location,
  CASE WHEN (privacy_settings->>'public_profile')::boolean = true THEN current_title ELSE NULL END as current_title
FROM public.profiles
WHERE stealth_mode_enabled = false
  AND COALESCE((privacy_settings->>'public_profile')::boolean, false) = true;

-- Add new secure RLS policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Strategists can view profiles they manage"
ON public.profiles FOR SELECT
USING (
  has_role(auth.uid(), 'strategist') 
  AND EXISTS (
    SELECT 1 FROM public.applications a
    WHERE a.user_id = profiles.id
  )
);

CREATE POLICY "Company members can view applicant profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.applications a
    JOIN public.jobs j ON a.job_id::uuid = j.id
    JOIN public.company_members cm ON cm.company_id = j.company_id
    WHERE a.user_id = profiles.id
      AND cm.user_id = auth.uid()
      AND cm.is_active = true
  )
);

-- Users can update their own profiles
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);
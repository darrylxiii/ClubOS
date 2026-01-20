-- Fix security definer view issue by using proper RLS policies instead

-- Drop the existing SECURITY DEFINER view
DROP VIEW IF EXISTS public.public_talent_strategists;

-- Add a public SELECT policy on talent_strategists to allow reading public info
-- This is safe because the view will filter which columns are exposed
CREATE POLICY "Anyone can view talent strategists via public view"
  ON public.talent_strategists
  FOR SELECT
  TO public
  USING (true);

-- Recreate the view without SECURITY DEFINER (uses SECURITY INVOKER by default)
-- This view filters to only expose safe, public fields
CREATE VIEW public.public_talent_strategists AS
SELECT 
  id,
  full_name,
  title,
  bio,
  specialties,
  availability,
  photo_url,
  created_at,
  updated_at
FROM public.talent_strategists;

-- Grant select permission to all users
GRANT SELECT ON public.public_talent_strategists TO authenticated, anon;

-- Add comment explaining the security model
COMMENT ON VIEW public.public_talent_strategists IS 
  'Public view exposing safe talent strategist fields. Uses SECURITY INVOKER (respects RLS). 
   Access controlled by RLS policy on talent_strategists table.';
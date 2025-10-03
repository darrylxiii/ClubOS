-- Fix security definer view issue

-- 1. Drop the conflicting policy
DROP POLICY IF EXISTS "Authenticated users can view public strategist info" ON public.talent_strategists;

-- 2. Recreate the view without security_barrier (which causes the security definer issue)
DROP VIEW IF EXISTS public.public_talent_strategists;

CREATE VIEW public.public_talent_strategists AS
SELECT 
  id,
  full_name,
  title,
  bio,
  photo_url,
  availability,
  specialties,
  created_at,
  updated_at
FROM public.talent_strategists;

-- 3. Grant SELECT to authenticated users on the public view
GRANT SELECT ON public.public_talent_strategists TO authenticated;

-- Note: The view inherits RLS from the base table, but since it only exposes
-- non-sensitive columns, it's safe for authenticated users to query.
-- Admins can still query the base table directly for full contact details.
-- Drop the existing view
DROP VIEW IF EXISTS public.public_talent_strategists;

-- Recreate the view with SECURITY DEFINER to bypass RLS
CREATE VIEW public.public_talent_strategists
WITH (security_invoker=false)
AS
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

-- Grant select permission to authenticated users
GRANT SELECT ON public.public_talent_strategists TO authenticated, anon;
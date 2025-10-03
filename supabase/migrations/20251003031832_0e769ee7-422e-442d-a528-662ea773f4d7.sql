-- Fix security definer view by enabling security invoker mode

-- Drop and recreate the view with security_invoker option
DROP VIEW IF EXISTS public.public_talent_strategists;

CREATE VIEW public.public_talent_strategists
WITH (security_invoker=on)
AS
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

-- Grant SELECT to authenticated users
GRANT SELECT ON public.public_talent_strategists TO authenticated;

-- Add comment explaining the security model
COMMENT ON VIEW public.public_talent_strategists IS 
'Public view of talent strategists with sensitive contact information (email, phone, social media) removed. 
Uses security_invoker to respect RLS policies. Only admins can access full contact details via the base table.';
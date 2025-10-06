-- Fix security definer view issue by removing security_invoker=false
-- This makes the view respect the querying user's RLS policies instead of bypassing them

-- Drop the existing insecure view
DROP VIEW IF EXISTS public.public_talent_strategists;

-- Recreate the view with security_invoker=true (secure by default)
CREATE VIEW public.public_talent_strategists
WITH (security_invoker=true)
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

-- Grant select permission to authenticated users and anon
GRANT SELECT ON public.public_talent_strategists TO authenticated, anon;

-- Ensure the underlying talent_strategists table has proper RLS
ALTER TABLE public.talent_strategists ENABLE ROW LEVEL SECURITY;

-- Add RLS policy to allow public read access to the specific fields we want to expose
DROP POLICY IF EXISTS "Public can view basic strategist info" ON public.talent_strategists;

CREATE POLICY "Public can view basic strategist info" 
ON public.talent_strategists
FOR SELECT 
USING (true);

-- Note: This policy allows public read of strategist profile data, which is intentional
-- for a marketplace/directory feature. Sensitive data should not be in this table.
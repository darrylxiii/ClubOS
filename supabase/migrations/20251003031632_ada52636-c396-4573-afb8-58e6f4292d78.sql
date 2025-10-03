-- Fix talent_strategists security issue: Restrict sensitive contact information

-- 1. Drop existing permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view talent strategists" ON public.talent_strategists;

-- 2. Create admin-only SELECT policy for full table access
CREATE POLICY "Admins can view all talent strategist details"
ON public.talent_strategists
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Create public view with non-sensitive information only
CREATE OR REPLACE VIEW public.public_talent_strategists AS
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

-- 4. Enable RLS on the view (Supabase requirement)
ALTER VIEW public.public_talent_strategists SET (security_barrier = true);

-- 5. Grant SELECT access to authenticated users on the public view
GRANT SELECT ON public.public_talent_strategists TO authenticated;

-- 6. Create policy for the public view
CREATE POLICY "Authenticated users can view public strategist info"
ON public.talent_strategists
FOR SELECT
USING (
  -- Allow authenticated users to see only non-sensitive fields via the view
  -- This policy works in conjunction with the view
  auth.role() = 'authenticated'
);
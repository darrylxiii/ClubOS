-- Fix unrestricted badge insertion policy
-- Restrict badge insertion to admin users only

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System awards badges" ON public.user_badges;

-- Create a secure policy that only allows admins to insert badges
CREATE POLICY "Admins award badges" ON public.user_badges 
  FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add comment documenting the security fix
COMMENT ON POLICY "Admins award badges" ON public.user_badges IS 
'Restricts badge insertion to admin users only. Prevents unauthorized badge awarding and maintains badge system integrity.';

-- Fix 1: Add 'partner' and 'member' to company_members role check constraint
ALTER TABLE public.company_members DROP CONSTRAINT IF EXISTS company_members_role_check;
ALTER TABLE public.company_members ADD CONSTRAINT company_members_role_check
  CHECK (role = ANY (ARRAY['owner', 'admin', 'recruiter', 'viewer', 'partner', 'member']));

-- Fix 2: Add INSERT policy for admin_member_approval_actions
CREATE POLICY "Admins can insert approval actions"
  ON public.admin_member_approval_actions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin'::app_role, 'strategist'::app_role)
    )
  );

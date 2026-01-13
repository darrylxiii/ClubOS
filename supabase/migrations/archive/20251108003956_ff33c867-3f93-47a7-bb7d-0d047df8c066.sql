-- Allow team members to see each other's roles for @mentions
CREATE POLICY "Team members can view team roles for mentions"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  -- User must be a team member themselves (has any of these roles)
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'strategist', 'partner')
  )
  -- And they can only see team member roles (not candidate roles)
  AND role IN ('admin', 'strategist', 'partner')
);
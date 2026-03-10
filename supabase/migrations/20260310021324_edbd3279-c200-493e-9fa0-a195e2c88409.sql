CREATE POLICY "Admins partners strategists can insert comments"
ON public.candidate_comments FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'partner'::app_role) OR
  public.has_role(auth.uid(), 'strategist'::app_role) OR
  user_id = auth.uid()
);
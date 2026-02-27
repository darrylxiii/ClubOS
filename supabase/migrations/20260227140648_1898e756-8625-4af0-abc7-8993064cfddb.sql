
-- Allow partners to INSERT jobs
DROP POLICY IF EXISTS "Company admins can create jobs" ON public.jobs;

CREATE POLICY "Company members can create jobs" ON public.jobs
FOR INSERT TO authenticated
WITH CHECK (
  has_company_role(auth.uid(), company_id, 'owner')
  OR has_company_role(auth.uid(), company_id, 'admin')
  OR has_company_role(auth.uid(), company_id, 'partner')
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'strategist'::app_role)
);

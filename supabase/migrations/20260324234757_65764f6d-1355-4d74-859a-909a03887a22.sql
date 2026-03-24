-- Add SELECT policy for strategists on applications
CREATE POLICY "Strategists can view all applications"
ON public.applications
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'strategist'::app_role));

-- Add SELECT policy for partners on applications (in case they're not company members)
CREATE POLICY "Partners can view all applications"
ON public.applications
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'partner'::app_role));
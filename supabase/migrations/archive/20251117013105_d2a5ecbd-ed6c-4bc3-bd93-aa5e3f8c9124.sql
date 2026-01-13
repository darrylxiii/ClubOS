-- Add INSERT policy for partners and admins to create companies
CREATE POLICY "Partners and admins can create companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'partner'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);
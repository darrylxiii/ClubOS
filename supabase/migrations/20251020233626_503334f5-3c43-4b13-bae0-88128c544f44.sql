-- Add RLS policy to allow company members to update their own company
-- This allows owners, admins, and recruiters of a company to edit company details

CREATE POLICY "Company members can update their company"
ON public.companies
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 
    FROM public.company_members 
    WHERE company_members.company_id = companies.id 
    AND company_members.user_id = auth.uid()
    AND company_members.is_active = true
    AND company_members.role IN ('owner', 'admin', 'recruiter')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.company_members 
    WHERE company_members.company_id = companies.id 
    AND company_members.user_id = auth.uid()
    AND company_members.is_active = true
    AND company_members.role IN ('owner', 'admin', 'recruiter')
  )
);
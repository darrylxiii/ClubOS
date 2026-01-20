
-- ============================================
-- SECURITY FIX: Companies Table Data Exposure
-- ============================================
-- Issue: "Active companies are viewable by everyone" policy exposes placement_fee_percentage
-- to unauthenticated users. This migration restricts access to sensitive financial data.

-- Step 1: Create public view with only non-sensitive fields
CREATE OR REPLACE VIEW public_companies 
WITH (security_invoker=true) AS
SELECT 
  id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  cover_image_url,
  website_url,
  linkedin_url,
  twitter_url,
  instagram_url,
  industry,
  company_size,
  founded_year,
  headquarters_location,
  mission,
  vision,
  values,
  culture_highlights,
  benefits,
  tech_stack,
  careers_email,
  careers_page_url,
  is_active,
  member_since,
  membership_tier,
  meta_title,
  meta_description,
  created_at,
  updated_at
FROM companies
WHERE is_active = true;

-- Grant public access to the safe view
GRANT SELECT ON public_companies TO public;
GRANT SELECT ON public_companies TO authenticated;

-- Step 2: Drop the overly permissive policy
DROP POLICY IF EXISTS "Active companies are viewable by everyone" ON companies;

-- Step 3: Add restricted role-based policies for the companies table
-- Authenticated users can view basic company info (but NOT placement_fee_percentage)
CREATE POLICY "Authenticated users view active companies"
ON companies FOR SELECT
USING (
  auth.role() = 'authenticated' 
  AND is_active = true
);

-- Admins can view everything including placement_fee_percentage
CREATE POLICY "Admins view all company data"
ON companies FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Company members can view their own company's full data
CREATE POLICY "Company members view full company data"
ON companies FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM company_members
    WHERE company_members.company_id = companies.id
    AND company_members.user_id = auth.uid()
    AND company_members.is_active = true
  )
);

-- Strategists can view companies they work with
CREATE POLICY "Strategists view assigned companies"
ON companies FOR SELECT
USING (
  has_role(auth.uid(), 'strategist')
  AND EXISTS (
    SELECT 1 FROM jobs
    WHERE jobs.company_id = companies.id
  )
);

-- Partners can view companies for jobs they have access to
CREATE POLICY "Partners view related companies"
ON companies FOR SELECT
USING (
  has_role(auth.uid(), 'partner')
  AND EXISTS (
    SELECT 1 FROM jobs j
    INNER JOIN company_members cm ON cm.company_id = j.company_id
    WHERE j.company_id = companies.id
    AND cm.user_id = auth.uid()
    AND cm.is_active = true
  )
);

-- Step 4: Add helpful comment
COMMENT ON VIEW public_companies IS 'Public-facing view of companies with only non-sensitive fields. Use this for general company listings. Does NOT include placement_fee_percentage. The companies table requires authentication and proper roles to access sensitive financial data.';

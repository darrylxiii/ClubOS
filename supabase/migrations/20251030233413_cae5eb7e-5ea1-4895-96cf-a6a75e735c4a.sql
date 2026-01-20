-- Add enrichment tracking and improve target companies schema
ALTER TABLE target_companies 
ADD COLUMN IF NOT EXISTS enrichment_source TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS source_company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- Add constraint for enrichment_source if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'target_companies_enrichment_source_check'
  ) THEN
    ALTER TABLE target_companies 
    ADD CONSTRAINT target_companies_enrichment_source_check 
    CHECK (enrichment_source IN ('database', 'clearbit', 'manual'));
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_target_companies_company_id ON target_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_target_companies_job_id ON target_companies(job_id);
CREATE INDEX IF NOT EXISTS idx_target_company_votes_target ON target_company_votes(target_company_id);

-- Enable RLS
ALTER TABLE target_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE target_company_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE target_company_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE target_company_contacts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Admins can view all target companies" ON target_companies;
DROP POLICY IF EXISTS "Partners can view their company targets" ON target_companies;
DROP POLICY IF EXISTS "Admins can manage all target companies" ON target_companies;
DROP POLICY IF EXISTS "Partners can manage their company targets" ON target_companies;
DROP POLICY IF EXISTS "Partners can update their company targets" ON target_companies;
DROP POLICY IF EXISTS "Partners can delete their company targets" ON target_companies;

-- Target companies policies
CREATE POLICY "Admins can view all target companies"
ON target_companies FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners can view their company targets"
ON target_companies FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM company_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Admins can manage all target companies"
ON target_companies FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners can manage their company targets"
ON target_companies FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM company_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Partners can update their company targets"
ON target_companies FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM company_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Partners can delete their company targets"
ON target_companies FOR DELETE
USING (
  company_id IN (
    SELECT company_id FROM company_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Votes policies
DROP POLICY IF EXISTS "Users can view votes for visible targets" ON target_company_votes;
DROP POLICY IF EXISTS "Users can manage their own votes" ON target_company_votes;

CREATE POLICY "Users can view votes for visible targets"
ON target_company_votes FOR SELECT
USING (
  target_company_id IN (SELECT id FROM target_companies)
);

CREATE POLICY "Users can manage their own votes"
ON target_company_votes FOR ALL
USING (user_id = auth.uid());

-- Comments policies
DROP POLICY IF EXISTS "Users can view comments for visible targets" ON target_company_comments;
DROP POLICY IF EXISTS "Users can create comments on visible targets" ON target_company_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON target_company_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON target_company_comments;

CREATE POLICY "Users can view comments for visible targets"
ON target_company_comments FOR SELECT
USING (
  target_company_id IN (SELECT id FROM target_companies)
);

CREATE POLICY "Users can create comments on visible targets"
ON target_company_comments FOR INSERT
WITH CHECK (
  target_company_id IN (SELECT id FROM target_companies)
  AND user_id = auth.uid()
);

CREATE POLICY "Users can update their own comments"
ON target_company_comments FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
ON target_company_comments FOR DELETE
USING (user_id = auth.uid());

-- Contacts policies
DROP POLICY IF EXISTS "Users can view contacts for visible targets" ON target_company_contacts;
DROP POLICY IF EXISTS "Users can manage contacts for visible targets" ON target_company_contacts;
DROP POLICY IF EXISTS "Users can update contacts they created" ON target_company_contacts;
DROP POLICY IF EXISTS "Users can delete contacts they created" ON target_company_contacts;

CREATE POLICY "Users can view contacts for visible targets"
ON target_company_contacts FOR SELECT
USING (
  target_company_id IN (SELECT id FROM target_companies)
);

CREATE POLICY "Users can manage contacts for visible targets"
ON target_company_contacts FOR INSERT
WITH CHECK (
  target_company_id IN (SELECT id FROM target_companies)
  AND created_by = auth.uid()
);

CREATE POLICY "Users can update contacts they created"
ON target_company_contacts FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Users can delete contacts they created"
ON target_company_contacts FOR DELETE
USING (created_by = auth.uid());
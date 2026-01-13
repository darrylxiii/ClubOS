-- Add candidate_id and sourcer tracking to applications
ALTER TABLE applications 
  ADD COLUMN IF NOT EXISTS candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sourced_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_context JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_applications_candidate_id ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_sourced_by ON applications(sourced_by);

-- Backfill candidate_id from user_id matching
UPDATE applications a
SET candidate_id = cp.id
FROM candidate_profiles cp
WHERE a.user_id = cp.user_id
  AND a.candidate_id IS NULL
  AND a.user_id IS NOT NULL;

-- Store structured feedback for company learning
CREATE TABLE IF NOT EXISTS company_candidate_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('advancement', 'rejection', 'offer', 'hire')),
  stage_name TEXT,
  
  rejection_reason TEXT,
  feedback_text TEXT,
  rating NUMERIC,
  
  skills_mismatch TEXT[],
  culture_fit_issues TEXT[],
  salary_mismatch BOOLEAN,
  location_mismatch BOOLEAN,
  seniority_mismatch TEXT,
  
  provided_by UUID REFERENCES profiles(id) NOT NULL,
  
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_feedback_company ON company_candidate_feedback(company_id);
CREATE INDEX IF NOT EXISTS idx_company_feedback_type ON company_candidate_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_company_feedback_job ON company_candidate_feedback(job_id);

-- Store role-specific learning
CREATE TABLE IF NOT EXISTS role_candidate_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('advancement', 'rejection', 'offer', 'hire')),
  stage_name TEXT,
  
  rejection_reason TEXT,
  feedback_text TEXT,
  
  skills_match_score NUMERIC,
  experience_match_score NUMERIC,
  specific_gaps TEXT[],
  strong_points TEXT[],
  
  provided_by UUID REFERENCES profiles(id) NOT NULL,
  
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_role_feedback_job ON role_candidate_feedback(job_id);
CREATE INDEX IF NOT EXISTS idx_role_feedback_type ON role_candidate_feedback(feedback_type);

ALTER TABLE company_candidate_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_candidate_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY company_feedback_admin ON company_candidate_feedback
  FOR ALL USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'partner') OR 
    has_role(auth.uid(), 'strategist')
  );

CREATE POLICY role_feedback_admin ON role_candidate_feedback
  FOR ALL USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'partner') OR 
    has_role(auth.uid(), 'strategist')
  );
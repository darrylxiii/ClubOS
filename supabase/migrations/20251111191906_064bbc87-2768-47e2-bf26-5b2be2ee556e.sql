-- Phase 1: Add embedded candidate fields to applications table
-- These fields store candidate data even when user_id is NULL (manually added candidates)

ALTER TABLE applications
ADD COLUMN IF NOT EXISTS candidate_full_name TEXT,
ADD COLUMN IF NOT EXISTS candidate_email TEXT,
ADD COLUMN IF NOT EXISTS candidate_phone TEXT,
ADD COLUMN IF NOT EXISTS candidate_title TEXT,
ADD COLUMN IF NOT EXISTS candidate_company TEXT,
ADD COLUMN IF NOT EXISTS candidate_linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS candidate_resume_url TEXT;

-- Create index for faster lookups by candidate email
CREATE INDEX IF NOT EXISTS idx_applications_candidate_email ON applications(candidate_email);

-- Backfill existing applications with data from profiles/candidate_profiles
UPDATE applications app
SET 
  candidate_full_name = COALESCE(cp.full_name, p.full_name),
  candidate_email = COALESCE(cp.email, p.email),
  candidate_phone = p.phone,
  candidate_title = cp.current_title,
  candidate_company = cp.current_company,
  candidate_linkedin_url = COALESCE(cp.linkedin_url, p.linkedin_url),
  candidate_resume_url = cp.resume_url
FROM profiles p
LEFT JOIN candidate_profiles cp ON cp.user_id = p.id
WHERE app.user_id = p.id
  AND app.candidate_full_name IS NULL;

COMMENT ON COLUMN applications.candidate_full_name IS 'Embedded candidate name - used when user_id is NULL (manually added candidates)';
COMMENT ON COLUMN applications.candidate_email IS 'Embedded candidate email - used when user_id is NULL';
COMMENT ON COLUMN applications.candidate_phone IS 'Embedded candidate phone - used when user_id is NULL';
COMMENT ON COLUMN applications.candidate_title IS 'Embedded candidate job title - used when user_id is NULL';
COMMENT ON COLUMN applications.candidate_company IS 'Embedded candidate company - used when user_id is NULL';
COMMENT ON COLUMN applications.candidate_linkedin_url IS 'Embedded candidate LinkedIn - used when user_id is NULL';
COMMENT ON COLUMN applications.candidate_resume_url IS 'Embedded candidate resume - used when user_id is NULL';
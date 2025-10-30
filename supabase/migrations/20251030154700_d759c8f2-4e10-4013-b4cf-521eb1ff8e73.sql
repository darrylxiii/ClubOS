-- Add new columns to candidate_profiles for enhanced onboarding
ALTER TABLE candidate_profiles 
  ADD COLUMN IF NOT EXISTS resume_url TEXT,
  ADD COLUMN IF NOT EXISTS resume_filename TEXT,
  ADD COLUMN IF NOT EXISTS remote_work_aspiration BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS salary_preference_hidden BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS current_salary_min NUMERIC,
  ADD COLUMN IF NOT EXISTS current_salary_max NUMERIC,
  ADD COLUMN IF NOT EXISTS assigned_strategist_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS application_status TEXT DEFAULT 'applied';

-- Add check constraint for application_status
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_application_status'
  ) THEN
    ALTER TABLE candidate_profiles
      ADD CONSTRAINT check_application_status 
      CHECK (application_status IN ('applied', 'under_review', 'contacted', 'assessment_scheduled', 'onboarded', 'rejected'));
  END IF;
END $$;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_application_status 
  ON candidate_profiles(application_status);

CREATE INDEX IF NOT EXISTS idx_candidate_profiles_assigned_strategist 
  ON candidate_profiles(assigned_strategist_id);

-- Add comment to clarify that desired_locations will store city + radius data
COMMENT ON COLUMN candidate_profiles.desired_locations IS 'Stores array of objects with city, country, and radius_km fields';

-- Add 3 missing columns to profiles table that are causing signup failures
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS remote_work_aspiration BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS resume_filename TEXT,
  ADD COLUMN IF NOT EXISTS salary_preference_hidden BOOLEAN DEFAULT false;

-- Add helpful comments
COMMENT ON COLUMN profiles.remote_work_aspiration IS 
  'Whether user aspires to work remotely (future goal vs current preference)';
COMMENT ON COLUMN profiles.resume_filename IS 
  'Original filename of uploaded resume for display in UI';
COMMENT ON COLUMN profiles.salary_preference_hidden IS 
  'Privacy toggle: hide salary info from partners until consent given';

-- Create indexes for filtering (only on boolean columns where true is uncommon)
CREATE INDEX IF NOT EXISTS idx_profiles_remote_work_aspiration 
  ON profiles(remote_work_aspiration) 
  WHERE remote_work_aspiration = true;

CREATE INDEX IF NOT EXISTS idx_profiles_salary_hidden 
  ON profiles(salary_preference_hidden) 
  WHERE salary_preference_hidden = true;

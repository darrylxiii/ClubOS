-- Drop the problematic trigger first
DROP TRIGGER IF EXISTS applications_activity_trigger ON public.applications;

-- Fix the log_activity function to use correct column names
CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Log application activities
  IF TG_TABLE_NAME = 'applications' THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO activity_timeline (user_id, activity_type, activity_data)
      VALUES (
        NEW.candidate_id,
        'application_submitted',
        jsonb_build_object('job_id', NEW.job_id, 'application_id', NEW.id)
      );
    ELSIF TG_OP = 'UPDATE' AND OLD.current_stage_index != NEW.current_stage_index THEN
      INSERT INTO activity_timeline (user_id, activity_type, activity_data)
      VALUES (
        NEW.candidate_id,
        'application_stage_changed',
        jsonb_build_object(
          'job_id', NEW.job_id, 
          'application_id', NEW.id, 
          'old_stage_index', OLD.current_stage_index, 
          'new_stage_index', NEW.current_stage_index
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Now fix existing applications by linking them to candidate_profiles
UPDATE applications a
SET candidate_id = ci.candidate_id
FROM candidate_interactions ci
WHERE ci.application_id = a.id
  AND a.candidate_id IS NULL
  AND ci.candidate_id IS NOT NULL
  AND ci.title = 'Candidate Added to Pipeline';

-- Add index for better performance on candidate_id lookups
CREATE INDEX IF NOT EXISTS idx_applications_candidate_id 
ON applications(candidate_id) 
WHERE candidate_id IS NOT NULL;

-- Add foreign key constraint to ensure data integrity going forward
ALTER TABLE applications
ADD CONSTRAINT fk_applications_candidate_profiles
FOREIGN KEY (candidate_id) 
REFERENCES candidate_profiles(id) 
ON DELETE CASCADE;

-- Recreate the trigger with the fixed function
CREATE TRIGGER applications_activity_trigger
  AFTER INSERT OR UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION log_activity();
-- Phase 1: Database Integrity - Prevent duplicate active applications in same job
-- Allow same candidate in multiple jobs (different job_ids)
-- Allow re-adding rejected candidates to same job

-- Step 1: Clean up existing duplicate active applications
-- Keep the most recent one, mark older ones as 'rejected'
WITH duplicate_apps AS (
  SELECT 
    id,
    job_id,
    candidate_id,
    applied_at,
    status,
    ROW_NUMBER() OVER (
      PARTITION BY job_id, candidate_id 
      ORDER BY applied_at DESC
    ) as row_num
  FROM applications
  WHERE status NOT IN ('rejected', 'withdrawn')
    AND candidate_id IS NOT NULL
)
UPDATE applications
SET status = 'rejected'
WHERE id IN (
  SELECT id FROM duplicate_apps WHERE row_num > 1
);

-- Step 2: Create unique constraint to prevent future duplicates
-- Partial index: only enforces uniqueness for active (non-rejected, non-withdrawn) applications
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_application_per_job
ON public.applications (job_id, candidate_id)
WHERE status NOT IN ('rejected', 'withdrawn') AND candidate_id IS NOT NULL;

-- Step 3: Add auto-merge function for when candidates sign up
-- This automatically links candidate profiles to user accounts
CREATE OR REPLACE FUNCTION auto_merge_candidate_on_signup()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matching_candidate_id uuid;
  matching_candidate_name text;
BEGIN
  -- Find candidate profile with matching email that hasn't been merged yet
  SELECT id, full_name INTO matching_candidate_id, matching_candidate_name
  FROM candidate_profiles
  WHERE lower(email) = lower(NEW.email)
    AND user_id IS NULL
    AND (merged_at IS NULL OR invitation_status != 'registered')
  ORDER BY created_at ASC -- Use oldest candidate profile if multiple
  LIMIT 1;

  IF matching_candidate_id IS NOT NULL THEN
    -- Link candidate profile to the new user account
    UPDATE candidate_profiles
    SET 
      user_id = NEW.id,
      merged_at = now(),
      invitation_status = 'registered'
    WHERE id = matching_candidate_id;
    
    -- Update applications to link to user as well
    UPDATE applications
    SET user_id = NEW.id
    WHERE candidate_id = matching_candidate_id
      AND user_id IS NULL;
    
    -- Log the auto-merge
    INSERT INTO candidate_merge_log (
      candidate_id,
      profile_id,
      merge_type,
      merge_status,
      completed_at,
      merge_metadata
    ) VALUES (
      matching_candidate_id,
      NEW.id,
      'auto',
      'completed',
      now(),
      jsonb_build_object(
        'trigger', 'auto_merge_on_signup',
        'matched_email', NEW.email,
        'candidate_name', matching_candidate_name
      )
    );
    
    -- Log interaction
    INSERT INTO candidate_interactions (
      candidate_id,
      interaction_type,
      interaction_direction,
      title,
      content,
      metadata,
      visible_to_candidate,
      is_internal
    ) VALUES (
      matching_candidate_id,
      'profile_merge',
      'system',
      'Profile Merged with User Account',
      'Candidate profile automatically merged when user signed up with matching email: ' || NEW.email,
      jsonb_build_object(
        'profile_id', NEW.id,
        'merge_type', 'auto',
        'merge_trigger', 'signup'
      ),
      false,
      true
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run auto-merge when profile is created
DROP TRIGGER IF EXISTS trg_auto_merge_on_signup ON profiles;
CREATE TRIGGER trg_auto_merge_on_signup
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION auto_merge_candidate_on_signup();
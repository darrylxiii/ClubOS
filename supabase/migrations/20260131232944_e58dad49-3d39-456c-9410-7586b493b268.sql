-- Phase 1: Clean up orphaned match_scores and add cascade delete

-- Step 1: Delete orphaned match_scores where the job has been deleted
DELETE FROM match_scores ms
WHERE ms.job_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
AND NOT EXISTS (
  SELECT 1 FROM jobs j WHERE j.id = ms.job_id::uuid
);

-- Step 2: Create a trigger function to auto-delete match_scores when a job is deleted
CREATE OR REPLACE FUNCTION public.cascade_delete_match_scores_on_job_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete all match_scores referencing this job
  DELETE FROM match_scores WHERE job_id = OLD.id::text;
  RETURN OLD;
END;
$$;

-- Step 3: Create the trigger on jobs table
DROP TRIGGER IF EXISTS trigger_cascade_delete_match_scores ON jobs;
CREATE TRIGGER trigger_cascade_delete_match_scores
  BEFORE DELETE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.cascade_delete_match_scores_on_job_delete();

-- Add manual urgency override columns to jobs table
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS urgency_score_manual smallint,
  ADD COLUMN IF NOT EXISTS urgency_score_manual_set_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS urgency_score_manual_set_at timestamptz;

-- Validation trigger for 0-10 range
CREATE OR REPLACE FUNCTION public.validate_urgency_score_manual()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.urgency_score_manual IS NOT NULL AND (NEW.urgency_score_manual < 0 OR NEW.urgency_score_manual > 10) THEN
    RAISE EXCEPTION 'urgency_score_manual must be between 0 and 10';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_urgency_score_manual ON public.jobs;
CREATE TRIGGER trg_validate_urgency_score_manual
  BEFORE INSERT OR UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_urgency_score_manual();

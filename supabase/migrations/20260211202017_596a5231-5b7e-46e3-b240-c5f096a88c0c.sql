
-- ============================================================
-- 3.1 Interview-to-Profile Aggregation
-- ============================================================

CREATE OR REPLACE FUNCTION public.aggregate_interview_performance(p_candidate_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg numeric;
  v_count integer;
  v_strengths text[];
  v_weaknesses text[];
BEGIN
  -- Calculate average of all score columns
  SELECT
    ROUND(AVG(
      (COALESCE(communication_clarity_score, 0) +
       COALESCE(communication_conciseness_score, 0) +
       COALESCE(communication_confidence_score, 0) +
       COALESCE(technical_competence_score, 0) +
       COALESCE(cultural_fit_score, 0)) / 5.0
    ), 2),
    COUNT(*)
  INTO v_avg, v_count
  FROM candidate_interview_performance
  WHERE candidate_id = p_candidate_id;

  -- Aggregate top strengths (most frequent across interviews)
  SELECT ARRAY(
    SELECT DISTINCT unnest(key_strengths)
    FROM candidate_interview_performance
    WHERE candidate_id = p_candidate_id
    LIMIT 10
  ) INTO v_strengths;

  -- Aggregate top weaknesses
  SELECT ARRAY(
    SELECT DISTINCT unnest(areas_for_improvement)
    FROM candidate_interview_performance
    WHERE candidate_id = p_candidate_id
    LIMIT 10
  ) INTO v_weaknesses;

  -- Update candidate profile
  UPDATE candidate_profiles SET
    interview_score_avg = v_avg,
    interview_count = v_count,
    key_strengths_aggregated = v_strengths,
    key_weaknesses_aggregated = v_weaknesses,
    updated_at = now()
  WHERE id = p_candidate_id;
END;
$$;

-- Trigger function
CREATE OR REPLACE FUNCTION public.trg_aggregate_interview()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM aggregate_interview_performance(NEW.candidate_id);
  RETURN NEW;
END;
$$;

-- Trigger on insert/update
DROP TRIGGER IF EXISTS trg_interview_aggregate ON candidate_interview_performance;
CREATE TRIGGER trg_interview_aggregate
  AFTER INSERT OR UPDATE ON candidate_interview_performance
  FOR EACH ROW
  EXECUTE FUNCTION trg_aggregate_interview();

-- ============================================================
-- 3.2 Company History Auto-Tracking on Application Terminal State
-- ============================================================

CREATE OR REPLACE FUNCTION public.trg_record_company_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_job_id uuid;
BEGIN
  -- Only act on terminal statuses
  IF NEW.status NOT IN ('hired', 'rejected', 'withdrawn', 'declined') THEN
    RETURN NEW;
  END IF;

  -- Only act if status actually changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get the job_id from the application
  v_job_id := NEW.job_id;

  -- Get company_id from the job
  SELECT company_id INTO v_company_id
  FROM jobs WHERE id = v_job_id;

  IF v_company_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Upsert into candidate_company_history
  INSERT INTO candidate_company_history (
    candidate_id,
    company_id,
    job_id,
    interaction_type,
    stage_reached,
    outcome_reason,
    could_revisit,
    revisit_after,
    created_at,
    updated_at
  ) VALUES (
    NEW.candidate_id,
    v_company_id,
    v_job_id,
    'application',
    NEW.status,
    CASE
      WHEN NEW.status = 'hired' THEN 'Successfully hired'
      WHEN NEW.status = 'rejected' THEN 'Not selected'
      WHEN NEW.status = 'withdrawn' THEN 'Candidate withdrew'
      WHEN NEW.status = 'declined' THEN 'Candidate declined offer'
    END,
    CASE WHEN NEW.status IN ('rejected', 'withdrawn', 'declined') THEN true ELSE false END,
    CASE WHEN NEW.status IN ('rejected', 'withdrawn', 'declined') THEN now() + interval '6 months' ELSE NULL END,
    now(),
    now()
  )
  ON CONFLICT (candidate_id, company_id, job_id)
  WHERE job_id IS NOT NULL
  DO UPDATE SET
    stage_reached = EXCLUDED.stage_reached,
    outcome_reason = EXCLUDED.outcome_reason,
    could_revisit = EXCLUDED.could_revisit,
    revisit_after = EXCLUDED.revisit_after,
    updated_at = now();

  RETURN NEW;
END;
$$;

-- Add unique constraint for upsert if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_candidate_company_job'
  ) THEN
    ALTER TABLE candidate_company_history
      ADD CONSTRAINT uq_candidate_company_job
      UNIQUE (candidate_id, company_id, job_id);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL; -- ignore if already exists or column issues
END;
$$;

DROP TRIGGER IF EXISTS trg_application_company_history ON applications;
CREATE TRIGGER trg_application_company_history
  AFTER UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION trg_record_company_history();

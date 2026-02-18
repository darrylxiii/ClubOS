CREATE OR REPLACE FUNCTION public.trg_record_company_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id uuid;
  v_job_id uuid;
  v_interaction_type text;
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

  -- Map application status to valid interaction_type values
  v_interaction_type := CASE
    WHEN NEW.status = 'hired' THEN 'hired'
    WHEN NEW.status = 'rejected' THEN 'rejected'
    WHEN NEW.status = 'withdrawn' THEN 'withdrew'
    WHEN NEW.status = 'declined' THEN 'rejected'
  END;

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
    v_interaction_type,
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
    interaction_type = EXCLUDED.interaction_type,
    stage_reached = EXCLUDED.stage_reached,
    outcome_reason = EXCLUDED.outcome_reason,
    could_revisit = EXCLUDED.could_revisit,
    revisit_after = EXCLUDED.revisit_after,
    updated_at = now();

  RETURN NEW;
END;
$function$;
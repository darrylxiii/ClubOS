
-- Create a function that can be called to trigger auto-matching
-- This is called via pg_net or manually after a job is published
CREATE OR REPLACE FUNCTION public.notify_job_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger when status changes to 'published' or 'open'
  IF (TG_OP = 'UPDATE' AND 
      OLD.status IS DISTINCT FROM NEW.status AND 
      NEW.status IN ('published', 'open', 'active')) THEN
    
    -- Insert an event for the auto-match system to pick up
    INSERT INTO public.agent_events (
      event_type,
      event_source,
      entity_type,
      entity_id,
      event_data,
      priority,
      processed
    ) VALUES (
      'job.published',
      'system_trigger',
      'job',
      NEW.id,
      jsonb_build_object(
        'job_title', NEW.title,
        'company_id', NEW.company_id,
        'published_at', now()
      ),
      8,
      false
    );
    
    RAISE LOG 'Job published event created for job: %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on jobs table
DROP TRIGGER IF EXISTS trg_job_published ON public.jobs;
CREATE TRIGGER trg_job_published
  AFTER UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_job_published();

-- Also create a helper function to aggregate interview performance
CREATE OR REPLACE FUNCTION public.aggregate_interview_performance(p_candidate_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg_score numeric;
  v_count integer;
  v_strengths text[];
  v_weaknesses text[];
BEGIN
  -- Calculate average interview scores
  SELECT 
    COUNT(*),
    AVG((COALESCE(communication_clarity, 0) + COALESCE(communication_confidence, 0) + 
         COALESCE(technical_competence, 0) + COALESCE(cultural_fit, 0)) / 4.0)
  INTO v_count, v_avg_score
  FROM candidate_interview_performance
  WHERE candidate_id = p_candidate_id;

  -- Aggregate green flags as strengths
  SELECT ARRAY_AGG(DISTINCT flag)
  INTO v_strengths
  FROM candidate_interview_performance,
       LATERAL unnest(green_flags) AS flag
  WHERE candidate_id = p_candidate_id
    AND green_flags IS NOT NULL;

  -- Aggregate red flags as weaknesses
  SELECT ARRAY_AGG(DISTINCT flag)
  INTO v_weaknesses
  FROM candidate_interview_performance,
       LATERAL unnest(red_flags) AS flag
  WHERE candidate_id = p_candidate_id
    AND red_flags IS NOT NULL;

  -- Update candidate profile
  UPDATE candidate_profiles
  SET 
    interview_score_avg = v_avg_score,
    key_strengths_aggregated = v_strengths,
    key_weaknesses_aggregated = v_weaknesses,
    updated_at = now()
  WHERE id = p_candidate_id;
END;
$$;

-- Create trigger to auto-aggregate after interview performance insert
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

DROP TRIGGER IF EXISTS trg_interview_performance_aggregate ON public.candidate_interview_performance;
CREATE TRIGGER trg_interview_performance_aggregate
  AFTER INSERT OR UPDATE ON public.candidate_interview_performance
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_aggregate_interview();

-- Create trigger to record company history on application terminal status
CREATE OR REPLACE FUNCTION public.record_application_company_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_job_title text;
BEGIN
  -- Only trigger on terminal statuses
  IF (TG_OP = 'UPDATE' AND 
      OLD.status IS DISTINCT FROM NEW.status AND 
      NEW.status IN ('hired', 'rejected', 'withdrawn', 'offer_declined')) THEN
    
    -- Get the company from the job
    SELECT j.company_id, j.title 
    INTO v_company_id, v_job_title
    FROM jobs j 
    WHERE j.id = NEW.job_id;

    IF v_company_id IS NOT NULL THEN
      INSERT INTO candidate_company_history (
        candidate_id,
        company_id,
        interaction_type,
        stage_reached,
        outcome,
        could_revisit,
        revisit_after,
        notes,
        created_at
      ) VALUES (
        NEW.candidate_id,
        v_company_id,
        'application',
        NEW.status,
        NEW.status,
        CASE WHEN NEW.status IN ('rejected', 'offer_declined') THEN true ELSE false END,
        CASE WHEN NEW.status IN ('rejected', 'offer_declined') 
             THEN (now() + interval '6 months')::timestamptz 
             ELSE NULL 
        END,
        format('Applied for %s. Final status: %s', v_job_title, NEW.status),
        now()
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_application_company_history ON public.applications;
CREATE TRIGGER trg_application_company_history
  AFTER UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.record_application_company_history();


-- Fix remaining function overloads missing search_path

-- Fix calculate_partner_benchmarks(uuid) overload
CREATE OR REPLACE FUNCTION public.calculate_partner_benchmarks(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_company_avg_time_to_hire numeric;
  v_industry_avg_time_to_hire numeric;
  v_company_offer_rate numeric;
  v_industry_offer_rate numeric;
BEGIN
  -- Calculate company metrics
  SELECT 
    AVG(EXTRACT(EPOCH FROM (a.updated_at - a.created_at)) / 86400)
  INTO v_company_avg_time_to_hire
  FROM applications a
  JOIN jobs j ON j.id = a.job_id
  WHERE j.company_id = p_company_id
    AND a.status = 'hired'
    AND a.updated_at >= NOW() - INTERVAL '90 days';

  -- Update or insert benchmark record (simplified - just log)
  RAISE NOTICE 'Benchmarks calculated for company %', p_company_id;
END;
$function$;

-- Fix generate_partner_smart_alerts() trigger function
CREATE OR REPLACE FUNCTION public.generate_partner_smart_alerts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_company_id uuid;
  v_job_title text;
  v_candidate_name text;
  v_days_in_stage integer;
BEGIN
  -- Get company_id from the job
  SELECT j.company_id, j.title 
  INTO v_company_id, v_job_title
  FROM jobs j
  WHERE j.id = NEW.job_id;
  
  -- Calculate days in current stage
  v_days_in_stage := EXTRACT(DAY FROM (NOW() - COALESCE(NEW.stage_updated_at, NEW.updated_at)));
  
  -- Log smart alert if candidate stuck > 7 days
  IF v_days_in_stage > 7 THEN
    INSERT INTO partner_smart_alerts (
      company_id, 
      alert_type, 
      title, 
      description, 
      priority,
      entity_type,
      entity_id,
      created_at
    )
    VALUES (
      v_company_id,
      'stale_candidate',
      'Candidate awaiting action',
      format('Candidate has been in %s stage for %s days', NEW.stage, v_days_in_stage),
      CASE WHEN v_days_in_stage > 14 THEN 'high' ELSE 'medium' END,
      'application',
      NEW.id,
      NOW()
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.calculate_partner_benchmarks(uuid) TO authenticated;

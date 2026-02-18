CREATE OR REPLACE FUNCTION generate_partner_smart_alerts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_company_id uuid;
  v_job_title text;
  v_days_in_stage integer;
BEGIN
  SELECT j.company_id, j.title
  INTO v_company_id, v_job_title
  FROM jobs j WHERE j.id = NEW.job_id;

  IF v_company_id IS NULL THEN RETURN NEW; END IF;

  v_days_in_stage := EXTRACT(DAY FROM
    (NOW() - COALESCE(NEW.stage_updated_at, NEW.updated_at)));

  IF v_days_in_stage > 7 THEN
    INSERT INTO partner_smart_alerts (
      company_id, alert_type, title, message, severity, metadata
    ) VALUES (
      v_company_id,
      'stale_candidate',
      'Candidate awaiting action',
      format('Candidate has been in current stage for %s days', v_days_in_stage),
      CASE WHEN v_days_in_stage > 14 THEN 'high' ELSE 'medium' END,
      jsonb_build_object('entity_type','application','entity_id',NEW.id)
    ) ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'generate_partner_smart_alerts failed: %', SQLERRM;
  RETURN NEW;
END;
$$;
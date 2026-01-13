-- Fix search_path for all functions created in the previous migration

CREATE OR REPLACE FUNCTION public.set_probation_end_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'hired' AND OLD.status != 'hired' THEN
    NEW.probation_end_date := CURRENT_DATE + INTERVAL '90 days';
    NEW.probation_status := 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.generate_probation_alerts()
RETURNS void AS $$
DECLARE
  app RECORD;
BEGIN
  FOR app IN 
    SELECT a.id, a.candidate_id, a.job_id, j.company_id, a.probation_end_date
    FROM public.applications a
    LEFT JOIN public.jobs j ON a.job_id = j.id
    WHERE a.status = 'hired' 
    AND a.probation_status = 'active'
    AND a.probation_end_date IS NOT NULL
  LOOP
    IF app.probation_end_date = CURRENT_DATE + INTERVAL '30 days' THEN
      INSERT INTO public.probation_alerts (application_id, candidate_id, job_id, company_id, alert_type, alert_date)
      VALUES (app.id, app.candidate_id, app.job_id, app.company_id, '30_days', CURRENT_DATE)
      ON CONFLICT DO NOTHING;
    END IF;
    
    IF app.probation_end_date = CURRENT_DATE + INTERVAL '14 days' THEN
      INSERT INTO public.probation_alerts (application_id, candidate_id, job_id, company_id, alert_type, alert_date)
      VALUES (app.id, app.candidate_id, app.job_id, app.company_id, '14_days', CURRENT_DATE)
      ON CONFLICT DO NOTHING;
    END IF;
    
    IF app.probation_end_date = CURRENT_DATE + INTERVAL '7 days' THEN
      INSERT INTO public.probation_alerts (application_id, candidate_id, job_id, company_id, alert_type, alert_date)
      VALUES (app.id, app.candidate_id, app.job_id, app.company_id, '7_days', CURRENT_DATE)
      ON CONFLICT DO NOTHING;
    END IF;
    
    IF app.probation_end_date = CURRENT_DATE THEN
      INSERT INTO public.probation_alerts (application_id, candidate_id, job_id, company_id, alert_type, alert_date)
      VALUES (app.id, app.candidate_id, app.job_id, app.company_id, 'ending_today', CURRENT_DATE)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.calculate_strategist_ranking_score(
  p_revenue NUMERIC,
  p_placements INTEGER,
  p_conversion_rate NUMERIC,
  p_avg_time_to_fill INTEGER,
  p_candidate_nps NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
  v_revenue_normalized NUMERIC;
  v_speed_bonus NUMERIC;
BEGIN
  v_revenue_normalized := COALESCE(p_revenue, 0) / 1000;
  v_speed_bonus := CASE 
    WHEN COALESCE(p_avg_time_to_fill, 0) > 0 THEN 100 / p_avg_time_to_fill
    ELSE 0
  END;
  
  RETURN (
    v_revenue_normalized * 0.3 +
    COALESCE(p_placements, 0) * 10 * 0.25 +
    COALESCE(p_conversion_rate, 0) * 0.2 +
    v_speed_bonus * 0.15 +
    COALESCE(p_candidate_nps, 0) * 10 * 0.1
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;
-- Fix security warnings: Use CREATE OR REPLACE to update functions with search_path

CREATE OR REPLACE FUNCTION public.update_deal_stage()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prev_stage TEXT;
  days_in_stage INTEGER;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.deal_stage IS DISTINCT FROM NEW.deal_stage THEN
    prev_stage := OLD.deal_stage;
    SELECT EXTRACT(DAY FROM (NOW() - OLD.updated_at))::INTEGER INTO days_in_stage;
    
    INSERT INTO public.deal_stage_history (
      deal_id, from_stage, to_stage, changed_by, duration_days
    ) VALUES (
      NEW.id, prev_stage, NEW.deal_stage, auth.uid(), days_in_stage
    );
    
    SELECT probability_weight INTO NEW.deal_probability
    FROM public.deal_stages WHERE name = NEW.deal_stage;
    
    NEW.last_activity_date := NOW();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_deal_health_score(job_id UUID)
RETURNS INTEGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  health_score INTEGER := 0;
  candidate_score INTEGER := 0;
  engagement_score INTEGER := 0;
  time_score INTEGER := 0;
  progression_score INTEGER := 0;
  data_score INTEGER := 0;
  days_since_activity INTEGER;
  active_candidates INTEGER;
  recent_activities INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_candidates
  FROM public.applications
  WHERE job_id = calculate_deal_health_score.job_id
    AND status NOT IN ('rejected', 'withdrawn');
  
  candidate_score := LEAST(30, active_candidates * 10);
  
  SELECT COUNT(*) INTO recent_activities
  FROM public.candidate_interactions
  WHERE job_id = calculate_deal_health_score.job_id
    AND created_at > NOW() - INTERVAL '14 days';
  
  engagement_score := LEAST(25, recent_activities * 5);
  
  SELECT EXTRACT(DAY FROM (NOW() - last_activity_date))::INTEGER INTO days_since_activity
  FROM public.jobs WHERE id = calculate_deal_health_score.job_id;
  
  time_score := CASE
    WHEN days_since_activity <= 7 THEN 20
    WHEN days_since_activity <= 14 THEN 15
    WHEN days_since_activity <= 30 THEN 10
    ELSE 0
  END;
  
  progression_score := 15;
  
  SELECT 
    CASE WHEN expected_close_date IS NOT NULL THEN 5 ELSE 0 END +
    CASE WHEN deal_value_override IS NOT NULL THEN 5 ELSE 0 END
  INTO data_score
  FROM public.jobs WHERE id = calculate_deal_health_score.job_id;
  
  health_score := candidate_score + engagement_score + time_score + progression_score + data_score;
  RETURN LEAST(100, health_score);
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_weighted_pipeline()
RETURNS TABLE(
  total_pipeline DECIMAL,
  weighted_pipeline DECIMAL,
  deal_count INTEGER,
  avg_deal_size DECIMAL
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN j.deal_value_override IS NOT NULL THEN j.deal_value_override
        ELSE COALESCE(pbd.default_fee_percentage / 100, 0.20) * 
             COALESCE(NULLIF(TRIM(cp.current_salary), '')::DECIMAL, 75000.00) *
             COUNT(DISTINCT a.id)
      END
    ), 0) as total_pipeline,
    COALESCE(SUM(
      (CASE 
        WHEN j.deal_value_override IS NOT NULL THEN j.deal_value_override
        ELSE COALESCE(pbd.default_fee_percentage / 100, 0.20) * 
             COALESCE(NULLIF(TRIM(cp.current_salary), '')::DECIMAL, 75000.00) *
             COUNT(DISTINCT a.id)
      END) * (j.deal_probability / 100)
    ), 0) as weighted_pipeline,
    COUNT(DISTINCT j.id)::INTEGER as deal_count,
    COALESCE(AVG(
      CASE 
        WHEN j.deal_value_override IS NOT NULL THEN j.deal_value_override
        ELSE COALESCE(pbd.default_fee_percentage / 100, 0.20) * 
             COALESCE(NULLIF(TRIM(cp.current_salary), '')::DECIMAL, 75000.00)
      END
    ), 0) as avg_deal_size
  FROM public.jobs j
  LEFT JOIN public.applications a ON a.job_id = j.id AND a.status NOT IN ('rejected', 'withdrawn')
  LEFT JOIN public.candidate_profiles cp ON cp.id = a.candidate_id
  LEFT JOIN public.partner_billing_details pbd ON pbd.company_id = j.company_id
  WHERE j.status = 'open' AND j.is_lost = false;
END;
$$;
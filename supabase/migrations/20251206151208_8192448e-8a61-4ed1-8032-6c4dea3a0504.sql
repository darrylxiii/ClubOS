-- Drop old functions first to allow return type change
DROP FUNCTION IF EXISTS public.calculate_weighted_pipeline();
DROP FUNCTION IF EXISTS public.get_pipeline_candidate_stats(UUID);

-- Fix calculate_weighted_pipeline function with correct columns and joins
CREATE FUNCTION public.calculate_weighted_pipeline()
RETURNS TABLE (
  total_pipeline_value NUMERIC,
  weighted_pipeline_value NUMERIC,
  deal_count INTEGER,
  avg_deal_size NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH job_values AS (
    SELECT 
      j.id,
      j.deal_value_override,
      COALESCE(c.placement_fee_percentage, 20) AS fee_pct,
      -- Salary fallback cascade: candidate avg -> job salary -> default
      COALESCE(
        -- Priority 1: Average candidate salary from pipeline
        (SELECT AVG(COALESCE(cp.desired_salary_min, cp.current_salary_min))
         FROM public.applications a
         JOIN public.candidate_profiles cp ON a.candidate_id = cp.id
         WHERE a.job_id = j.id 
           AND a.status NOT IN ('rejected', 'withdrawn', 'closed')
           AND (cp.desired_salary_min IS NOT NULL OR cp.current_salary_min IS NOT NULL)),
        -- Priority 2: Job salary max
        j.salary_max::NUMERIC,
        -- Priority 3: Job salary min  
        j.salary_min::NUMERIC,
        -- Priority 4: Default
        75000.00
      ) AS base_salary,
      -- Get probability from deal_stages table with case-insensitive match
      COALESCE(
        (SELECT ds.probability_weight FROM public.deal_stages ds WHERE LOWER(ds.name) = LOWER(j.deal_stage)),
        j.deal_probability,
        10
      ) AS probability
    FROM public.jobs j
    LEFT JOIN public.companies c ON c.id = j.company_id
    WHERE j.status = 'published' AND j.is_lost = false
  ),
  calculated_values AS (
    SELECT 
      jv.id,
      COALESCE(jv.deal_value_override, (jv.fee_pct / 100.0) * jv.base_salary) AS deal_value,
      jv.probability
    FROM job_values jv
  )
  SELECT 
    COALESCE(SUM(cv.deal_value), 0)::NUMERIC as total_pipeline_value,
    COALESCE(SUM(cv.deal_value * cv.probability / 100.0), 0)::NUMERIC as weighted_pipeline_value,
    COUNT(*)::INTEGER as deal_count,
    COALESCE(AVG(cv.deal_value), 0)::NUMERIC as avg_deal_size
  FROM calculated_values cv;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.calculate_weighted_pipeline() TO authenticated;

-- Fix get_pipeline_candidate_stats function
CREATE FUNCTION public.get_pipeline_candidate_stats(p_job_id UUID)
RETURNS TABLE (
  candidate_count INTEGER,
  avg_current_salary NUMERIC,
  avg_desired_salary NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT a.candidate_id)::INTEGER as candidate_count,
    COALESCE(AVG(cp.current_salary_min), 0)::NUMERIC as avg_current_salary,
    COALESCE(AVG(cp.desired_salary_min), 0)::NUMERIC as avg_desired_salary
  FROM public.applications a
  LEFT JOIN public.candidate_profiles cp ON a.candidate_id = cp.id
  WHERE a.job_id = p_job_id
    AND a.status NOT IN ('rejected', 'withdrawn', 'closed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_pipeline_candidate_stats(UUID) TO authenticated;
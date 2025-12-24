-- Drop existing function first since return type is changing
DROP FUNCTION IF EXISTS public.calculate_weighted_pipeline();

-- Recreate with new return type including multi-hire metrics
CREATE OR REPLACE FUNCTION public.calculate_weighted_pipeline()
RETURNS TABLE (
  total_pipeline_value NUMERIC,
  weighted_pipeline_value NUMERIC,
  deal_count INTEGER,
  avg_deal_size NUMERIC,
  multi_hire_total_projected NUMERIC,
  multi_hire_realized NUMERIC,
  multi_hire_remaining NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH job_fees AS (
    SELECT 
      j.id,
      j.deal_value_override,
      j.target_hire_count,
      COALESCE(j.hired_count, 0) as hired_count,
      CASE 
        WHEN j.job_fee_type = 'fixed' AND j.job_fee_fixed IS NOT NULL THEN 'fixed'
        WHEN j.job_fee_type = 'percentage' AND j.job_fee_percentage IS NOT NULL THEN 'percentage'
        WHEN c.fee_type = 'fixed' AND c.placement_fee_fixed IS NOT NULL THEN 'fixed'
        ELSE 'percentage'
      END AS effective_fee_type,
      CASE 
        WHEN j.job_fee_type = 'fixed' AND j.job_fee_fixed IS NOT NULL THEN j.job_fee_fixed
        WHEN c.fee_type = 'fixed' AND c.placement_fee_fixed IS NOT NULL THEN c.placement_fee_fixed
        ELSE 0
      END AS fixed_fee,
      CASE
        WHEN j.job_fee_type = 'percentage' AND j.job_fee_percentage IS NOT NULL THEN j.job_fee_percentage
        WHEN c.fee_type IN ('percentage', 'hybrid') AND c.placement_fee_percentage IS NOT NULL THEN c.placement_fee_percentage
        ELSE 20
      END AS fee_pct,
      COALESCE(
        (SELECT AVG(COALESCE(cp.desired_salary_min, cp.current_salary_min))
         FROM public.applications a
         JOIN public.candidate_profiles cp ON a.candidate_id = cp.id
         WHERE a.job_id = j.id 
           AND a.status NOT IN ('rejected', 'withdrawn', 'closed')
           AND (cp.desired_salary_min IS NOT NULL OR cp.current_salary_min IS NOT NULL)),
        j.salary_max::NUMERIC,
        j.salary_min::NUMERIC,
        75000.00
      ) AS base_salary,
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
      jf.id,
      jf.target_hire_count,
      jf.hired_count,
      CASE 
        WHEN jf.deal_value_override IS NOT NULL THEN jf.deal_value_override
        WHEN jf.effective_fee_type = 'fixed' THEN jf.fixed_fee
        ELSE (jf.fee_pct / 100.0) * jf.base_salary
      END AS single_fee,
      jf.probability
    FROM job_fees jf
  ),
  multi_hire_metrics AS (
    SELECT
      COALESCE(SUM(
        CASE WHEN cv.target_hire_count > 1 
          THEN cv.single_fee * cv.target_hire_count 
          ELSE 0 
        END
      ), 0) as mh_total_projected,
      COALESCE(SUM(
        CASE WHEN cv.target_hire_count > 1 
          THEN cv.single_fee * cv.hired_count 
          ELSE 0 
        END
      ), 0) as mh_realized,
      COALESCE(SUM(
        CASE WHEN cv.target_hire_count > 1 
          THEN cv.single_fee * (cv.target_hire_count - cv.hired_count) 
          ELSE 0 
        END
      ), 0) as mh_remaining
    FROM calculated_values cv
  ),
  pipeline_values AS (
    SELECT 
      COALESCE(SUM(
        cv.single_fee * GREATEST(COALESCE(cv.target_hire_count, 1) - cv.hired_count, 1)
      ), 0) as total_val,
      COALESCE(SUM(
        cv.single_fee * GREATEST(COALESCE(cv.target_hire_count, 1) - cv.hired_count, 1) * cv.probability / 100.0
      ), 0) as weighted_val,
      COUNT(*) as cnt,
      COALESCE(AVG(cv.single_fee), 0) as avg_size
    FROM calculated_values cv
  )
  SELECT 
    pv.total_val::NUMERIC as total_pipeline_value,
    pv.weighted_val::NUMERIC as weighted_pipeline_value,
    pv.cnt::INTEGER as deal_count,
    pv.avg_size::NUMERIC as avg_deal_size,
    mhm.mh_total_projected::NUMERIC as multi_hire_total_projected,
    mhm.mh_realized::NUMERIC as multi_hire_realized,
    mhm.mh_remaining::NUMERIC as multi_hire_remaining
  FROM pipeline_values pv, multi_hire_metrics mhm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.calculate_weighted_pipeline() TO authenticated;
-- Drop existing function first since return type is changing or just to ensure clean replace
DROP FUNCTION IF EXISTS public.calculate_weighted_pipeline();

-- Recreate with predictive analytics (Elite Pipeline 2.0)
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
      
      -- ELITE UPGRADE 1: Base Salary securely capped by job.salary_max + 5% leniency
      COALESCE(
        CASE 
          WHEN j.salary_max IS NOT NULL AND app_stats.avg_salary > (j.salary_max::NUMERIC * 1.05) THEN (j.salary_max::NUMERIC * 1.05)
          ELSE app_stats.avg_salary
        END,
        j.salary_max::NUMERIC,
        j.salary_min::NUMERIC,
        75000.00
      ) AS base_salary,
      
      -- Base static probability from global kanban config
      COALESCE(
        (SELECT ds.probability_weight FROM public.deal_stages ds WHERE LOWER(ds.name) = LOWER(j.deal_stage)),
        j.deal_probability,
        10
      ) AS base_probability,
      
      -- Extracted Days Since Activity
      GREATEST(0, EXTRACT(DAY FROM (NOW() - COALESCE(j.last_activity_date, j.created_at)))) AS days_stale,
      
      -- Deal Health Defaulted Safe
      COALESCE(j.deal_health_score, 100) AS health,
      
      -- Active density pool
      COALESCE(app_stats.active_applicants, 0) AS applicant_count
      
    FROM public.jobs j
    LEFT JOIN public.companies c ON c.id = j.company_id
    -- Dynamic App Density Subquery via LATERAL join
    LEFT JOIN LATERAL (
      SELECT 
        COUNT(a.id) as active_applicants,
        AVG(COALESCE(cp.desired_salary_min, cp.current_salary_min)) as avg_salary
      FROM public.applications a
      JOIN public.candidate_profiles cp ON a.candidate_id = cp.id
      WHERE a.job_id = j.id 
        AND a.status NOT IN ('rejected', 'withdrawn', 'closed')
        AND (cp.desired_salary_min IS NOT NULL OR cp.current_salary_min IS NOT NULL)
    ) app_stats ON true
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
      
      -- ELITE UPGRADE 2: Time Decay Penalty (-0.5% per stale day after 30 days)
      GREATEST(0, jf.base_probability - (GREATEST(0, jf.days_stale - 30) * 0.5)) AS decay_prob,
      
      jf.health,
      jf.applicant_count
    FROM job_fees jf
  ),
  predictive_values AS (
    SELECT 
       id,
       target_hire_count,
       hired_count,
       single_fee,
       
       -- ELITE UPGRADE 3 & 4: Deal Health Ratio & Density Scalers
       LEAST(100, 
         decay_prob * (health / 100.0) * 
         CASE 
            WHEN applicant_count = 0 THEN 0.5   -- Severe 50% penalty for Ghost-Town deals
            WHEN applicant_count >= 4 THEN 1.15 -- 15% Confidence boost for highly active pools
            ELSE 1.0 
         END
       ) AS final_probability
    FROM calculated_values
  ),
  multi_hire_metrics AS (
    SELECT
      COALESCE(SUM(
        CASE WHEN pv.target_hire_count > 1 
          THEN pv.single_fee * pv.target_hire_count 
          ELSE 0 
        END
      ), 0) as mh_total_projected,
      COALESCE(SUM(
        CASE WHEN pv.target_hire_count > 1 
          THEN pv.single_fee * pv.hired_count 
          ELSE 0 
        END
      ), 0) as mh_realized,
      COALESCE(SUM(
        CASE WHEN pv.target_hire_count > 1 
          THEN pv.single_fee * (pv.target_hire_count - pv.hired_count) 
          ELSE 0 
        END
      ), 0) as mh_remaining
    FROM predictive_values pv
  ),
  pipeline_values AS (
    SELECT 
      COALESCE(SUM(
        pv.single_fee * GREATEST(COALESCE(pv.target_hire_count, 1) - pv.hired_count, 1)
      ), 0) as total_val,
      COALESCE(SUM(
        pv.single_fee * GREATEST(COALESCE(pv.target_hire_count, 1) - pv.hired_count, 1) * pv.final_probability / 100.0
      ), 0) as weighted_val,
      COUNT(*) as cnt,
      COALESCE(AVG(pv.single_fee), 0) as avg_size
    FROM predictive_values pv
  )
  -- Output Final Unified Array
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

GRANT EXECUTE ON FUNCTION public.calculate_weighted_pipeline() TO authenticated;

-- 1. Create the Admin Strategic Insights View
CREATE OR REPLACE VIEW public.admin_strategic_insights AS
WITH global_stats AS (
  SELECT 
    COUNT(CASE WHEN status = 'closed' AND NOT is_lost THEN 1 END) as global_won,
    COUNT(CASE WHEN status = 'closed' AND is_lost THEN 1 END) as global_lost,
    NULLIF(COUNT(CASE WHEN status = 'closed' THEN 1 END), 0) as global_closed,
    EXTRACT(DAY FROM AVG(CASE WHEN status = 'closed' AND NOT is_lost THEN closed_at - created_at END)) as global_avg_close_days
  FROM public.jobs
),
company_stats AS (
  SELECT 
    company_id,
    COUNT(CASE WHEN status = 'closed' AND NOT is_lost THEN 1 END) as comp_won,
    COUNT(CASE WHEN status = 'closed' AND is_lost THEN 1 END) as comp_lost,
    NULLIF(COUNT(CASE WHEN status = 'closed' THEN 1 END), 0) as comp_closed,
    EXTRACT(DAY FROM AVG(CASE WHEN status = 'closed' AND NOT is_lost THEN closed_at - created_at END)) as comp_avg_close_days
  FROM public.jobs
  GROUP BY company_id
),
job_analysis AS (
  SELECT 
    j.id as job_id,
    j.title,
    c.name as company_name,
    j.deal_stage,
    j.created_at,
    j.last_activity_date,
    EXTRACT(DAY FROM NOW() - j.created_at) as days_open,
    EXTRACT(DAY FROM NOW() - COALESCE(j.last_activity_date, j.created_at)) as days_stale,
    cs.comp_won,
    cs.comp_closed,
    cs.comp_avg_close_days,
    gs.global_avg_close_days,
    (SELECT COUNT(*) FROM public.applications a WHERE a.job_id = j.id AND a.status NOT IN ('rejected', 'withdrawn', 'closed')) as active_apps
  FROM public.jobs j
  LEFT JOIN public.companies c ON c.id = j.company_id
  LEFT JOIN company_stats cs ON cs.company_id = j.company_id
  CROSS JOIN global_stats gs
  WHERE j.status = 'published' AND j.is_lost = false
)
SELECT 
  job_id,
  title,
  company_name,
  CASE 
    WHEN days_stale > 21 AND active_apps = 0 THEN 
      '🚨 Deal [' || title || '] has lived in the ''' || deal_stage || ''' stage with 0 active candidates for ' || days_stale || ' days. 95% of deals this stale are historically Lost. Recommend terminating to reclaim recruiter bandwidth.'
    WHEN comp_avg_close_days IS NOT NULL AND days_open > (comp_avg_close_days * 1.5) THEN
      '⚠️ Company [' || COALESCE(company_name, 'Unknown') || '] takes ' || comp_avg_close_days || ' days to close deals on average, but this deal is ' || days_open || ' days old. Evaluate internal blockers.'
    WHEN global_avg_close_days IS NOT NULL AND days_open > (global_avg_close_days * 1.5) AND active_apps = 0 THEN
      '⚠️ Deal [' || title || '] is ' || days_open || ' days old (Global average is ' || COALESCE(global_avg_close_days, 45) || ' days). Zero candidate velocity. Re-engage client or pause search.'
    WHEN active_apps >= 5 AND deal_stage IN ('New', 'Pitch', 'Sourcing') THEN
      '⭐ Deal [' || title || '] has ' || active_apps || ' active candidates but is stuck in early stages. Push candidates to Interviewing to accelerate time-to-close.'
    ELSE
      '✅ Deal [' || title || '] is progressing normally. ' || active_apps || ' active candidates.'
  END as strategic_insight,
  CASE 
    WHEN days_stale > 21 AND active_apps = 0 THEN 100
    WHEN comp_avg_close_days IS NOT NULL AND days_open > (comp_avg_close_days * 1.5) THEN 80
    WHEN global_avg_close_days IS NOT NULL AND days_open > (global_avg_close_days * 1.5) THEN 70
    WHEN active_apps >= 5 AND deal_stage IN ('New', 'Pitch', 'Sourcing') THEN 60
    ELSE 10
  END as urgency_score
FROM job_analysis;

-- Grant permissions for View
GRANT SELECT ON public.admin_strategic_insights TO authenticated;

-- 2. Upgrade the calculate_weighted_pipeline with Bayesian ML
DROP FUNCTION IF EXISTS public.calculate_weighted_pipeline();

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
  WITH global_stats AS (
    SELECT 
      COALESCE(COUNT(CASE WHEN status = 'closed' AND NOT is_lost THEN 1 END)::NUMERIC / NULLIF(COUNT(CASE WHEN status = 'closed' THEN 1 END), 0), 0.3) as global_win_rate
    FROM public.jobs
  ),
  company_stats AS (
    SELECT 
      company_id,
      COALESCE(COUNT(CASE WHEN status = 'closed' AND NOT is_lost THEN 1 END)::NUMERIC / NULLIF(COUNT(CASE WHEN status = 'closed' THEN 1 END), 0), 0.3) as comp_win_rate,
      LEAST(1.0, COUNT(CASE WHEN status = 'closed' THEN 1 END) / 5.0) as trust_score
    FROM public.jobs
    GROUP BY company_id
  ),
  job_fees AS (
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
      
      -- ELITE: Base Salary securely capped by job.salary_max
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
      ) AS base_stage_probability,
      
      -- BAYESIAN FUSION: Historical Win Rate Prediction (Fuses trust score with global baseline)
      COALESCE(
        (cs.comp_win_rate * cs.trust_score) + (gs.global_win_rate * (1.0 - cs.trust_score)),
        gs.global_win_rate
      ) AS bayesian_win_rate,
      
      -- Extracted Days Since Activity
      GREATEST(0, EXTRACT(DAY FROM (NOW() - COALESCE(j.last_activity_date, j.created_at)))) AS days_stale,
      
      -- Deal Health
      COALESCE(j.deal_health_score, 100) AS health,
      
      -- Active density pool
      COALESCE(app_stats.active_applicants, 0) AS applicant_count
      
    FROM public.jobs j
    LEFT JOIN public.companies c ON c.id = j.company_id
    LEFT JOIN company_stats cs ON cs.company_id = j.company_id
    CROSS JOIN global_stats gs
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
      
      -- ML Blended Prediction: Half weight to Stage progression, Half weight to Historical Bayesian Reality
      ((jf.base_stage_probability * 2.0) + (jf.bayesian_win_rate * 100.0)) / 3.0 AS blended_base_prob,
      
      jf.days_stale,
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
       
       -- ELITE UPGRADE: Time Decay, Deal Health & Density Scalers
       LEAST(100, 
         GREATEST(0, blended_base_prob - (GREATEST(0, days_stale - 30) * 0.5)) 
         * (health / 100.0) * 
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

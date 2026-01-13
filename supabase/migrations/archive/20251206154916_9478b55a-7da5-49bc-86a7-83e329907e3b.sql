-- Add fee type columns to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS fee_type TEXT DEFAULT 'percentage' CHECK (fee_type IN ('percentage', 'fixed', 'hybrid')),
ADD COLUMN IF NOT EXISTS placement_fee_fixed NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS default_fee_notes TEXT DEFAULT NULL;

-- Add fee override columns to jobs table
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS job_fee_type TEXT DEFAULT NULL CHECK (job_fee_type IS NULL OR job_fee_type IN ('percentage', 'fixed')),
ADD COLUMN IF NOT EXISTS job_fee_percentage NUMERIC DEFAULT NULL CHECK (job_fee_percentage IS NULL OR (job_fee_percentage >= 0 AND job_fee_percentage <= 100)),
ADD COLUMN IF NOT EXISTS job_fee_fixed NUMERIC DEFAULT NULL CHECK (job_fee_fixed IS NULL OR job_fee_fixed >= 0),
ADD COLUMN IF NOT EXISTS fee_source TEXT DEFAULT 'company' CHECK (fee_source IN ('company', 'job_override', 'manual'));

-- Create helper function to calculate job placement fee
CREATE OR REPLACE FUNCTION public.calculate_job_placement_fee(p_job_id UUID)
RETURNS TABLE (
  fee_type TEXT,
  fee_amount NUMERIC,
  fee_percentage NUMERIC,
  fee_source TEXT,
  confidence_level TEXT
) AS $$
DECLARE
  v_job RECORD;
  v_company RECORD;
BEGIN
  -- Get job details
  SELECT j.*, c.fee_type AS company_fee_type, 
         c.placement_fee_percentage AS company_fee_pct,
         c.placement_fee_fixed AS company_fee_fixed
  INTO v_job
  FROM public.jobs j
  LEFT JOIN public.companies c ON c.id = j.company_id
  WHERE j.id = p_job_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'none'::TEXT, 0::NUMERIC, 0::NUMERIC, 'unknown'::TEXT, 'none'::TEXT;
    RETURN;
  END IF;

  -- Priority 1: Job-level override with fixed fee
  IF v_job.job_fee_type = 'fixed' AND v_job.job_fee_fixed IS NOT NULL THEN
    RETURN QUERY SELECT 'fixed'::TEXT, v_job.job_fee_fixed, 0::NUMERIC, 'job_override'::TEXT, 'high'::TEXT;
    RETURN;
  END IF;

  -- Priority 2: Job-level override with percentage
  IF v_job.job_fee_type = 'percentage' AND v_job.job_fee_percentage IS NOT NULL THEN
    RETURN QUERY SELECT 'percentage'::TEXT, 0::NUMERIC, v_job.job_fee_percentage, 'job_override'::TEXT, 'high'::TEXT;
    RETURN;
  END IF;

  -- Priority 3: Company fixed fee
  IF v_job.company_fee_type = 'fixed' AND v_job.company_fee_fixed IS NOT NULL THEN
    RETURN QUERY SELECT 'fixed'::TEXT, v_job.company_fee_fixed, 0::NUMERIC, 'company'::TEXT, 'high'::TEXT;
    RETURN;
  END IF;

  -- Priority 4: Company percentage fee
  IF v_job.company_fee_type IN ('percentage', 'hybrid') AND v_job.company_fee_pct IS NOT NULL THEN
    RETURN QUERY SELECT 'percentage'::TEXT, 0::NUMERIC, v_job.company_fee_pct, 'company'::TEXT, 'medium'::TEXT;
    RETURN;
  END IF;

  -- Priority 5: Default percentage
  RETURN QUERY SELECT 'percentage'::TEXT, 0::NUMERIC, 20::NUMERIC, 'default'::TEXT, 'low'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update calculate_weighted_pipeline to support all fee types
DROP FUNCTION IF EXISTS public.calculate_weighted_pipeline();
CREATE FUNCTION public.calculate_weighted_pipeline()
RETURNS TABLE (
  total_pipeline_value NUMERIC,
  weighted_pipeline_value NUMERIC,
  deal_count INTEGER,
  avg_deal_size NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH job_fees AS (
    SELECT 
      j.id,
      j.deal_value_override,
      -- Determine fee type and amount
      CASE 
        -- Priority 1: Job fixed fee override
        WHEN j.job_fee_type = 'fixed' AND j.job_fee_fixed IS NOT NULL THEN 'fixed'
        -- Priority 2: Job percentage override  
        WHEN j.job_fee_type = 'percentage' AND j.job_fee_percentage IS NOT NULL THEN 'percentage'
        -- Priority 3: Company fixed fee
        WHEN c.fee_type = 'fixed' AND c.placement_fee_fixed IS NOT NULL THEN 'fixed'
        -- Priority 4: Company percentage
        ELSE 'percentage'
      END AS effective_fee_type,
      -- Get the fee value
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
      -- Salary fallback cascade
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
      -- Get probability from deal_stages
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
      CASE 
        WHEN jf.deal_value_override IS NOT NULL THEN jf.deal_value_override
        WHEN jf.effective_fee_type = 'fixed' THEN jf.fixed_fee
        ELSE (jf.fee_pct / 100.0) * jf.base_salary
      END AS deal_value,
      jf.probability
    FROM job_fees jf
  )
  SELECT 
    COALESCE(SUM(cv.deal_value), 0)::NUMERIC as total_pipeline_value,
    COALESCE(SUM(cv.deal_value * cv.probability / 100.0), 0)::NUMERIC as weighted_pipeline_value,
    COUNT(*)::INTEGER as deal_count,
    COALESCE(AVG(cv.deal_value), 0)::NUMERIC as avg_deal_size
  FROM calculated_values cv;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.calculate_job_placement_fee(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_weighted_pipeline() TO authenticated;

-- Backfill: Set fee_type = 'percentage' for all companies with existing percentage fees
UPDATE public.companies 
SET fee_type = 'percentage' 
WHERE placement_fee_percentage IS NOT NULL AND fee_type IS NULL;
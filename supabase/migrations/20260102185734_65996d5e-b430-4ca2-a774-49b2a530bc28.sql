-- Add referral bonus fields to jobs table
ALTER TABLE public.jobs 
  ADD COLUMN IF NOT EXISTS referral_bonus_percentage NUMERIC(5,2) DEFAULT 10,
  ADD COLUMN IF NOT EXISTS referral_bonus_fixed NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS show_referral_bonus BOOLEAN DEFAULT true;

-- Create RPC to calculate pipeline metrics with referral obligations
CREATE OR REPLACE FUNCTION public.calculate_pipeline_with_referrals()
RETURNS TABLE (
  gross_pipeline NUMERIC,
  referral_obligations NUMERIC,
  net_pipeline NUMERIC,
  weighted_gross NUMERIC,
  weighted_net NUMERIC,
  deal_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH pipeline_values AS (
    SELECT 
      j.id,
      COALESCE(j.deal_value_override, 
        COALESCE(j.salary_max, j.salary_min, 60000) * 
        COALESCE(c.placement_fee_percentage, 20) / 100
      ) as deal_value,
      COALESCE(j.deal_probability, 50) / 100.0 as probability
    FROM jobs j
    LEFT JOIN companies c ON j.company_id = c.id
    WHERE j.status = 'published' AND j.is_lost = false
  ),
  referral_totals AS (
    SELECT 
      COALESCE(SUM(weighted_amount), 0) as total_weighted,
      COALESCE(SUM(projected_amount), 0) as total_projected
    FROM referral_earnings
    WHERE status IN ('projected', 'qualified')
  )
  SELECT 
    COALESCE(SUM(p.deal_value), 0)::NUMERIC as gross_pipeline,
    (SELECT total_projected FROM referral_totals)::NUMERIC as referral_obligations,
    (COALESCE(SUM(p.deal_value), 0) - (SELECT total_projected FROM referral_totals))::NUMERIC as net_pipeline,
    COALESCE(SUM(p.deal_value * p.probability), 0)::NUMERIC as weighted_gross,
    (COALESCE(SUM(p.deal_value * p.probability), 0) - (SELECT total_weighted FROM referral_totals))::NUMERIC as weighted_net,
    COUNT(p.id)::BIGINT as deal_count
  FROM pipeline_values p;
END;
$$;

-- Create function to calculate potential referral earnings for a job
CREATE OR REPLACE FUNCTION public.calculate_job_referral_potential(
  p_job_id UUID,
  p_referral_percentage NUMERIC DEFAULT NULL
)
RETURNS TABLE (
  job_id UUID,
  estimated_fee NUMERIC,
  referral_bonus_percentage NUMERIC,
  potential_earnings NUMERIC,
  salary_used NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job RECORD;
  v_fee_percentage NUMERIC;
  v_referral_pct NUMERIC;
  v_salary NUMERIC;
  v_fee NUMERIC;
BEGIN
  -- Get job details
  SELECT 
    j.*,
    c.placement_fee_percentage
  INTO v_job
  FROM jobs j
  LEFT JOIN companies c ON j.company_id = c.id
  WHERE j.id = p_job_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Calculate values
  v_fee_percentage := COALESCE(v_job.placement_fee_percentage, 20);
  v_referral_pct := COALESCE(p_referral_percentage, v_job.referral_bonus_percentage, 10);
  v_salary := COALESCE(v_job.salary_max, v_job.salary_min, 75000);
  v_fee := v_salary * (v_fee_percentage / 100);

  RETURN QUERY
  SELECT 
    p_job_id,
    v_fee,
    v_referral_pct,
    v_fee * (v_referral_pct / 100),
    v_salary;
END;
$$;

-- Create index for faster referral earnings queries
CREATE INDEX IF NOT EXISTS idx_referral_earnings_status_referrer 
ON referral_earnings(referrer_id, status) 
WHERE status IN ('projected', 'qualified');
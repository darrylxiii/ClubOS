CREATE OR REPLACE FUNCTION public.calculate_pipeline_with_referrals()
RETURNS TABLE(
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
      ) as single_deal_value,
      GREATEST(COALESCE(j.target_hire_count, 1) - COALESCE(j.hired_count, 0), 1) as remaining_positions,
      COALESCE(ds.probability_weight, 50) / 100.0 as probability
    FROM jobs j
    LEFT JOIN companies c ON j.company_id = c.id
    LEFT JOIN deal_stages ds ON LOWER(j.deal_stage) = LOWER(ds.name)
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
    COALESCE(SUM(p.single_deal_value * p.remaining_positions), 0)::NUMERIC as gross_pipeline,
    (SELECT total_projected FROM referral_totals)::NUMERIC as referral_obligations,
    (COALESCE(SUM(p.single_deal_value * p.remaining_positions), 0) - (SELECT total_projected FROM referral_totals))::NUMERIC as net_pipeline,
    COALESCE(SUM(p.single_deal_value * p.remaining_positions * p.probability), 0)::NUMERIC as weighted_gross,
    (COALESCE(SUM(p.single_deal_value * p.remaining_positions * p.probability), 0) - (SELECT total_weighted FROM referral_totals))::NUMERIC as weighted_net,
    COUNT(p.id)::BIGINT as deal_count
  FROM pipeline_values p;
END;
$$;
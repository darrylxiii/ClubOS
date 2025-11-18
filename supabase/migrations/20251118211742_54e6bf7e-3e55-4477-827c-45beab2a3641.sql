-- Phase 3: Create RPC for candidate salary aggregation
CREATE OR REPLACE FUNCTION get_pipeline_candidate_stats(p_job_id uuid)
RETURNS TABLE (
  candidate_count integer,
  avg_expected_salary numeric,
  avg_current_salary numeric,
  salary_range_min numeric,
  salary_range_max numeric
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT a.candidate_id)::integer,
    AVG(ct.target_salary_min)::numeric,
    AVG(cc.current_salary)::numeric,
    MIN(ct.target_salary_min)::numeric,
    MAX(ct.target_salary_max)::numeric
  FROM applications a
  LEFT JOIN compensation_target ct ON ct.candidate_id = a.candidate_id
  LEFT JOIN compensation_current cc ON cc.candidate_id = a.candidate_id
  WHERE a.job_id = p_job_id
  AND a.status NOT IN ('rejected', 'withdrawn');
END;
$$;

-- Phase 4: Create stage conversion tracking tables
CREATE TABLE IF NOT EXISTS deal_stage_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  from_stage text NOT NULL,
  to_stage text NOT NULL,
  converted boolean NOT NULL,
  conversion_timestamp timestamptz DEFAULT now(),
  days_in_previous_stage integer,
  candidate_count integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversions_job ON deal_stage_conversions(job_id);
CREATE INDEX IF NOT EXISTS idx_conversions_stages ON deal_stage_conversions(from_stage, to_stage);
CREATE INDEX IF NOT EXISTS idx_conversions_timestamp ON deal_stage_conversions(conversion_timestamp);

-- Enable RLS
ALTER TABLE deal_stage_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and strategists manage conversions" ON deal_stage_conversions
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'strategist')
  );

-- Create trigger to track stage changes
CREATE OR REPLACE FUNCTION track_deal_stage_conversion()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.deal_stage IS DISTINCT FROM NEW.deal_stage THEN
    INSERT INTO deal_stage_conversions (
      job_id,
      from_stage,
      to_stage,
      converted,
      days_in_previous_stage,
      candidate_count
    )
    SELECT 
      NEW.id,
      OLD.deal_stage,
      NEW.deal_stage,
      NOT NEW.is_lost,
      EXTRACT(EPOCH FROM (NOW() - OLD.updated_at)) / 86400,
      (SELECT COUNT(*) FROM applications WHERE job_id = NEW.id AND status NOT IN ('rejected', 'withdrawn'))
    ;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS track_stage_changes ON jobs;
CREATE TRIGGER track_stage_changes
  AFTER UPDATE OF deal_stage ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION track_deal_stage_conversion();

-- Create function to calculate historical conversion rates
CREATE OR REPLACE FUNCTION get_historical_conversion_rate(
  p_stage text,
  p_company_id uuid DEFAULT NULL,
  p_lookback_days integer DEFAULT 180
)
RETURNS numeric 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conversion_rate numeric;
BEGIN
  SELECT 
    (COUNT(*) FILTER (WHERE dsc.converted = true)::numeric / 
     NULLIF(COUNT(*)::numeric, 0)) * 100
  INTO conversion_rate
  FROM deal_stage_conversions dsc
  JOIN jobs j ON j.id = dsc.job_id
  WHERE dsc.from_stage = p_stage
  AND dsc.conversion_timestamp >= NOW() - (p_lookback_days || ' days')::interval
  AND (p_company_id IS NULL OR j.company_id = p_company_id);
  
  RETURN COALESCE(conversion_rate, 0);
END;
$$;

-- Create view for pipeline conversion metrics
CREATE OR REPLACE VIEW pipeline_conversion_metrics AS
SELECT 
  from_stage,
  to_stage,
  COUNT(*) as total_transitions,
  COUNT(*) FILTER (WHERE converted = true) as successful_transitions,
  (COUNT(*) FILTER (WHERE converted = true)::numeric / NULLIF(COUNT(*)::numeric, 0)) * 100 as conversion_rate,
  AVG(days_in_previous_stage) as avg_days_in_stage,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY days_in_previous_stage) as median_days_in_stage
FROM deal_stage_conversions
WHERE conversion_timestamp >= NOW() - INTERVAL '180 days'
GROUP BY from_stage, to_stage
ORDER BY from_stage, to_stage;

COMMENT ON TABLE deal_stage_conversions IS 'Tracks historical deal stage transitions for conversion rate analysis';
COMMENT ON FUNCTION get_pipeline_candidate_stats IS 'Aggregates candidate salary data for revenue calculations';
COMMENT ON FUNCTION get_historical_conversion_rate IS 'Calculates conversion rate from a specific stage based on historical data';
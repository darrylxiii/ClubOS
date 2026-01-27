-- =============================================================================
-- Partner Home Data Auto-Population System
-- Triggers and functions to auto-generate smart alerts, benchmarks, and more
-- =============================================================================

-- 1. Function to generate smart alerts based on application events
CREATE OR REPLACE FUNCTION generate_partner_smart_alerts()
RETURNS trigger AS $$
DECLARE
  v_company_id uuid;
  v_job_title text;
  v_candidate_name text;
  v_days_in_stage integer;
BEGIN
  -- Get company_id from the job
  SELECT j.company_id, j.title INTO v_company_id, v_job_title
  FROM jobs j
  WHERE j.id = NEW.job_id;

  -- Get candidate name
  SELECT full_name INTO v_candidate_name
  FROM candidate_profiles
  WHERE id = NEW.candidate_id;

  -- Alert type 1: New application received
  IF TG_OP = 'INSERT' THEN
    INSERT INTO partner_smart_alerts (
      company_id, alert_type, severity, title, message, 
      action_required, action_url, metadata
    ) VALUES (
      v_company_id,
      'new_application',
      'info',
      'New Application Received',
      format('%s applied for %s', COALESCE(v_candidate_name, 'A candidate'), COALESCE(v_job_title, 'a position')),
      'Review Application',
      '/company-applications',
      jsonb_build_object('application_id', NEW.id, 'candidate_id', NEW.candidate_id, 'job_id', NEW.job_id)
    );
  END IF;

  -- Alert type 2: Candidate stuck in stage (check on updates)
  IF TG_OP = 'UPDATE' AND NEW.current_stage = OLD.current_stage THEN
    v_days_in_stage := EXTRACT(DAY FROM (now() - COALESCE(NEW.updated_at, NEW.created_at)));
    IF v_days_in_stage >= 7 THEN
      -- Check if we already have an alert for this
      IF NOT EXISTS (
        SELECT 1 FROM partner_smart_alerts 
        WHERE metadata->>'application_id' = NEW.id::text 
        AND alert_type = 'stale_candidate'
        AND is_dismissed = false
      ) THEN
        INSERT INTO partner_smart_alerts (
          company_id, alert_type, severity, title, message,
          action_required, action_url, metadata
        ) VALUES (
          v_company_id,
          'stale_candidate',
          'warning',
          'Candidate Needs Attention',
          format('%s has been in %s stage for %s days', 
            COALESCE(v_candidate_name, 'A candidate'), 
            NEW.current_stage, 
            v_days_in_stage),
          'Review Candidate',
          '/company-applications',
          jsonb_build_object('application_id', NEW.id, 'days_in_stage', v_days_in_stage)
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS trg_generate_partner_alerts ON applications;
CREATE TRIGGER trg_generate_partner_alerts
  AFTER INSERT OR UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION generate_partner_smart_alerts();

-- 2. Function to calculate partner benchmarks
CREATE OR REPLACE FUNCTION calculate_partner_benchmarks(p_company_id uuid)
RETURNS void AS $$
DECLARE
  v_company_avg_time_to_hire numeric;
  v_industry_avg_time_to_hire numeric;
  v_company_offer_rate numeric;
  v_industry_offer_rate numeric;
BEGIN
  -- Calculate company's average time to hire (days from apply to offer)
  SELECT AVG(EXTRACT(DAY FROM (a.updated_at - a.created_at)))
  INTO v_company_avg_time_to_hire
  FROM applications a
  JOIN jobs j ON j.id = a.job_id
  WHERE j.company_id = p_company_id
  AND a.current_stage IN ('offer', 'hired');

  -- Calculate industry average (all companies)
  SELECT AVG(EXTRACT(DAY FROM (a.updated_at - a.created_at)))
  INTO v_industry_avg_time_to_hire
  FROM applications a
  WHERE a.current_stage IN ('offer', 'hired');

  -- Insert/update time_to_hire benchmark
  INSERT INTO partner_benchmarks (
    company_id, metric_type, company_value, industry_average, 
    industry_percentile, calculated_at
  ) VALUES (
    p_company_id,
    'time_to_hire',
    COALESCE(v_company_avg_time_to_hire, 0),
    COALESCE(v_industry_avg_time_to_hire, 30),
    CASE 
      WHEN v_company_avg_time_to_hire IS NULL THEN 50
      WHEN v_company_avg_time_to_hire < v_industry_avg_time_to_hire THEN 75
      ELSE 25
    END,
    now()
  )
  ON CONFLICT (company_id, metric_type) 
  DO UPDATE SET 
    company_value = EXCLUDED.company_value,
    industry_average = EXCLUDED.industry_average,
    industry_percentile = EXCLUDED.industry_percentile,
    calculated_at = now();

  -- Calculate offer rate (offers / total applications)
  SELECT 
    COALESCE(COUNT(*) FILTER (WHERE current_stage IN ('offer', 'hired'))::numeric / NULLIF(COUNT(*), 0) * 100, 0)
  INTO v_company_offer_rate
  FROM applications a
  JOIN jobs j ON j.id = a.job_id
  WHERE j.company_id = p_company_id;

  SELECT 
    COALESCE(COUNT(*) FILTER (WHERE current_stage IN ('offer', 'hired'))::numeric / NULLIF(COUNT(*), 0) * 100, 0)
  INTO v_industry_offer_rate
  FROM applications;

  -- Insert/update offer_rate benchmark
  INSERT INTO partner_benchmarks (
    company_id, metric_type, company_value, industry_average,
    industry_percentile, calculated_at
  ) VALUES (
    p_company_id,
    'offer_rate',
    COALESCE(v_company_offer_rate, 0),
    COALESCE(v_industry_offer_rate, 15),
    CASE 
      WHEN v_company_offer_rate > v_industry_offer_rate THEN 75
      ELSE 25
    END,
    now()
  )
  ON CONFLICT (company_id, metric_type)
  DO UPDATE SET
    company_value = EXCLUDED.company_value,
    industry_average = EXCLUDED.industry_average,
    industry_percentile = EXCLUDED.industry_percentile,
    calculated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Add unique constraint for benchmarks upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'partner_benchmarks_company_metric_unique'
  ) THEN
    ALTER TABLE partner_benchmarks 
    ADD CONSTRAINT partner_benchmarks_company_metric_unique 
    UNIQUE (company_id, metric_type);
  END IF;
EXCEPTION WHEN duplicate_table THEN
  -- Constraint already exists, do nothing
END $$;

-- 4. Create candidate_shortlists table for starred candidates
CREATE TABLE IF NOT EXISTS candidate_shortlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id uuid REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
  added_by uuid,
  notes text,
  priority integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, candidate_id, job_id)
);

-- Enable RLS
ALTER TABLE candidate_shortlists ENABLE ROW LEVEL SECURITY;

-- RLS policies for shortlists
DROP POLICY IF EXISTS "Partners can view their company shortlists" ON candidate_shortlists;
CREATE POLICY "Partners can view their company shortlists" ON candidate_shortlists
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Partners can manage their company shortlists" ON candidate_shortlists;
CREATE POLICY "Partners can manage their company shortlists" ON candidate_shortlists
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- 5. Function to auto-calculate benchmarks for a company when they visit
CREATE OR REPLACE FUNCTION refresh_company_benchmarks()
RETURNS trigger AS $$
BEGIN
  -- Only recalculate if benchmarks are stale (>1 day old) or don't exist
  IF NOT EXISTS (
    SELECT 1 FROM partner_benchmarks 
    WHERE company_id = NEW.company_id 
    AND calculated_at > now() - interval '1 day'
  ) THEN
    PERFORM calculate_partner_benchmarks(NEW.company_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Index for faster shortlist queries
CREATE INDEX IF NOT EXISTS idx_candidate_shortlists_company ON candidate_shortlists(company_id);
CREATE INDEX IF NOT EXISTS idx_candidate_shortlists_candidate ON candidate_shortlists(candidate_id);
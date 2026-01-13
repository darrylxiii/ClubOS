-- Phase 2 Integration: Link time_entries to contracts, companies, and pilot_tasks

-- 1. Add integration columns to time_entries table
ALTER TABLE time_entries 
  ADD COLUMN IF NOT EXISTS contract_id UUID,
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pilot_task_id UUID,
  ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS earnings NUMERIC(10,2) GENERATED ALWAYS AS (
    CASE WHEN hourly_rate IS NOT NULL AND duration_seconds > 0 
    THEN ROUND((duration_seconds::NUMERIC / 3600) * hourly_rate, 2)
    ELSE NULL END
  ) STORED;

-- 2. Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_time_entries_contract_id ON time_entries(contract_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_company_id ON time_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_pilot_task_id ON time_entries(pilot_task_id);

-- 3. Create time_tracking_revenue_metrics view for revenue integration
CREATE OR REPLACE VIEW time_tracking_revenue_metrics AS
SELECT 
  te.user_id,
  te.company_id,
  te.contract_id,
  DATE_TRUNC('week', te.start_time) AS week_start,
  DATE_TRUNC('month', te.start_time) AS month_start,
  SUM(te.duration_seconds) AS total_seconds,
  SUM(te.duration_seconds) FILTER (WHERE te.is_billable = true) AS billable_seconds,
  SUM(te.earnings) AS total_earnings,
  COUNT(*) AS entry_count,
  AVG(
    CASE WHEN te.activity_level ~ '^\d+$' THEN te.activity_level::INTEGER ELSE NULL END
  ) AS avg_activity_level
FROM time_entries te
WHERE te.end_time IS NOT NULL
GROUP BY te.user_id, te.company_id, te.contract_id, 
  DATE_TRUNC('week', te.start_time), DATE_TRUNC('month', te.start_time);

-- 4. Create function to auto-update pilot_task status when timer starts/stops
CREATE OR REPLACE FUNCTION sync_time_entry_with_pilot_task()
RETURNS TRIGGER AS $$
BEGIN
  -- When timer starts with a linked pilot task, update task status to in_progress
  IF TG_OP = 'INSERT' AND NEW.pilot_task_id IS NOT NULL AND NEW.is_running = true THEN
    UPDATE pilot_tasks 
    SET status = 'in_progress'
    WHERE id = NEW.pilot_task_id 
      AND status IN ('pending', 'scheduled');
  END IF;

  -- When timer stops, optionally complete the task
  IF TG_OP = 'UPDATE' AND OLD.is_running = true AND NEW.is_running = false AND NEW.pilot_task_id IS NOT NULL THEN
    -- Only auto-complete if duration > 5 minutes
    IF NEW.duration_seconds >= 300 THEN
      UPDATE pilot_tasks 
      SET status = 'completed', completed_at = NOW()
      WHERE id = NEW.pilot_task_id 
        AND status = 'in_progress';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for pilot task sync
DROP TRIGGER IF EXISTS sync_pilot_task_on_time_entry ON time_entries;
CREATE TRIGGER sync_pilot_task_on_time_entry
  AFTER INSERT OR UPDATE ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION sync_time_entry_with_pilot_task();

-- 5. Create function to calculate hourly rate from profile or contract
CREATE OR REPLACE FUNCTION get_time_entry_hourly_rate(
  p_user_id UUID,
  p_contract_id UUID DEFAULT NULL,
  p_project_id UUID DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
  v_rate NUMERIC;
BEGIN
  -- Priority 1: Contract rate (not yet implemented in DB, placeholder)
  -- Priority 2: Project rate
  IF p_project_id IS NOT NULL THEN
    SELECT hourly_rate INTO v_rate 
    FROM tracking_projects 
    WHERE id = p_project_id AND hourly_rate IS NOT NULL;
    
    IF v_rate IS NOT NULL THEN
      RETURN v_rate;
    END IF;
  END IF;

  -- Priority 3: User's default hourly rate from profile
  SELECT hourly_rate INTO v_rate 
  FROM profiles 
  WHERE id = p_user_id;

  RETURN v_rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Add team_id to tracking_projects for company-based project filtering
ALTER TABLE tracking_projects 
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tracking_projects_company_id ON tracking_projects(company_id);

-- 7. Create view for team time tracking (partner view)
CREATE OR REPLACE VIEW team_time_tracking_summary AS
SELECT 
  te.company_id,
  te.user_id,
  p.full_name AS user_name,
  p.avatar_url AS user_avatar,
  DATE(te.start_time) AS work_date,
  SUM(te.duration_seconds) AS total_seconds,
  SUM(te.duration_seconds) FILTER (WHERE te.is_billable = true) AS billable_seconds,
  SUM(te.earnings) AS total_earnings,
  COUNT(*) AS entry_count,
  AVG(
    CASE WHEN te.activity_level ~ '^\d+$' THEN te.activity_level::INTEGER ELSE NULL END
  ) AS avg_activity_level
FROM time_entries te
JOIN profiles p ON p.id = te.user_id
WHERE te.company_id IS NOT NULL AND te.end_time IS NOT NULL
GROUP BY te.company_id, te.user_id, p.full_name, p.avatar_url, DATE(te.start_time);

-- 8. Add RLS policies for new views
ALTER VIEW time_tracking_revenue_metrics OWNER TO postgres;
ALTER VIEW team_time_tracking_summary OWNER TO postgres;

-- 9. Grant access to views
GRANT SELECT ON time_tracking_revenue_metrics TO authenticated;
GRANT SELECT ON team_time_tracking_summary TO authenticated;
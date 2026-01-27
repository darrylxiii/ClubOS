-- PHASE 1: PARTNER HOME - DATABASE AUTOMATION (SIMPLIFIED)

-- 1. Add unique constraint
ALTER TABLE company_strategist_assignments 
ADD CONSTRAINT unique_company_strategist UNIQUE (company_id, strategist_id);

-- 2. Smart alerts trigger
CREATE OR REPLACE FUNCTION public.trigger_generate_smart_alerts()
RETURNS TRIGGER AS $$
DECLARE v_company_id uuid; v_job_title text; v_candidate_name text;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  SELECT j.company_id, j.title INTO v_company_id, v_job_title FROM jobs j WHERE j.id = COALESCE(NEW.job_id, OLD.job_id);
  IF v_company_id IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(cp.full_name, p.full_name, 'Candidate') INTO v_candidate_name FROM profiles p LEFT JOIN candidate_profiles cp ON cp.user_id = p.id WHERE p.id = COALESCE(NEW.candidate_id, OLD.candidate_id);
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO partner_smart_alerts (company_id, alert_type, severity, title, message, action_required, action_url, metadata, is_dismissed)
    VALUES (v_company_id, 'new_application', 'info', 'New Application', format('%s applied for %s', v_candidate_name, v_job_title), 'Review', format('/applications/%s', NEW.id), jsonb_build_object('application_id', NEW.id), false);
  END IF;
  
  IF TG_OP = 'UPDATE' AND NEW.status = 'hired' AND OLD.status != 'hired' THEN
    INSERT INTO partner_smart_alerts (company_id, alert_type, severity, title, message, action_required, action_url, metadata, is_dismissed)
    VALUES (v_company_id, 'placement_success', 'success', 'Placement Confirmed!', format('%s accepted %s', v_candidate_name, v_job_title), null, format('/applications/%s', NEW.id), jsonb_build_object('application_id', NEW.id), false);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_smart_alerts_on_application ON applications;
CREATE TRIGGER trigger_smart_alerts_on_application AFTER INSERT OR UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION trigger_generate_smart_alerts();

-- 3. SLA tracking trigger
CREATE OR REPLACE FUNCTION public.trigger_create_sla_tracking()
RETURNS TRIGGER AS $$
DECLARE v_company_id uuid;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  SELECT j.company_id INTO v_company_id FROM jobs j WHERE j.id = NEW.job_id;
  IF v_company_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO partner_sla_tracking (company_id, metric_type, target_value, actual_value, is_met, reference_id, reference_type, measured_at)
    VALUES (v_company_id, 'application_response_time', 2880, 0, false, NEW.id, 'application', now());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_sla_on_application ON applications;
CREATE TRIGGER trigger_sla_on_application AFTER INSERT OR UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION trigger_create_sla_tracking();

-- 4. Add revenue goal column
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'annual_revenue_goal') THEN
    ALTER TABLE companies ADD COLUMN annual_revenue_goal numeric DEFAULT 200000;
  END IF;
END $$;

-- 5. Performance indexes
CREATE INDEX IF NOT EXISTS idx_partner_smart_alerts_company ON partner_smart_alerts(company_id, is_dismissed, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_sla_tracking_company ON partner_sla_tracking(company_id, is_met, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_company_strategist_assignments_active ON company_strategist_assignments(company_id, is_active);

-- 6. Backfill strategist assignments
INSERT INTO company_strategist_assignments (company_id, strategist_id, is_active, assigned_at)
SELECT c.id, strat.id, true, now()
FROM companies c
CROSS JOIN (SELECT p.id FROM profiles p JOIN user_roles ur ON ur.user_id = p.id WHERE ur.role = 'strategist' LIMIT 1) strat
WHERE NOT EXISTS (SELECT 1 FROM company_strategist_assignments csa WHERE csa.company_id = c.id)
ON CONFLICT (company_id, strategist_id) DO NOTHING;
-- =====================================================
-- SMART SYSTEM LINKAGE: Complete Automation Suite
-- =====================================================

-- ===================
-- PHASE 1: CRITICAL FIXES (P0)
-- ===================

-- 1.1 Standard Job Hire → Hired Count Increment + Auto-Close
CREATE OR REPLACE FUNCTION public.increment_hired_count_on_standard_hire()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger when status changes TO 'hired'
  IF NEW.status = 'hired' AND (OLD.status IS NULL OR OLD.status IS DISTINCT FROM 'hired') THEN
    UPDATE jobs 
    SET hired_count = COALESCE(hired_count, 0) + 1,
        updated_at = now()
    WHERE id = NEW.job_id;
    
    -- Check if job should auto-close (target reached)
    UPDATE jobs
    SET status = 'closed',
        deal_stage = 'Closed Won',
        deal_probability = 100,
        closed_at = now(),
        is_lost = false,
        updated_at = now()
    WHERE id = NEW.job_id
      AND status IN ('published', 'open', 'active')
      AND target_hire_count IS NOT NULL
      AND target_hire_count > 0
      AND hired_count >= target_hire_count;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for hired count increment
DROP TRIGGER IF EXISTS trigger_increment_hired_on_application ON applications;
CREATE TRIGGER trigger_increment_hired_on_application
AFTER UPDATE ON applications
FOR EACH ROW
WHEN (NEW.status = 'hired' AND OLD.status IS DISTINCT FROM 'hired')
EXECUTE FUNCTION increment_hired_count_on_standard_hire();

-- 1.2 Referral Earnings Status Sync on Hire/Reject
CREATE OR REPLACE FUNCTION public.sync_referral_earnings_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'hired' AND OLD.status IS DISTINCT FROM 'hired' THEN
    -- Update all referral earnings linked to this application to realized
    UPDATE referral_earnings
    SET status = 'realized',
        qualified_at = COALESCE(qualified_at, now()),
        updated_at = now()
    WHERE application_id = NEW.id
      AND status IN ('pending', 'projected', 'qualified');
      
  ELSIF NEW.status IN ('rejected', 'withdrawn', 'closed') 
        AND OLD.status NOT IN ('rejected', 'withdrawn', 'closed') THEN
    -- Cancel earnings if application is rejected/withdrawn/closed
    UPDATE referral_earnings
    SET status = 'forfeited',
        updated_at = now()
    WHERE application_id = NEW.id
      AND status IN ('pending', 'projected', 'qualified');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for referral earnings sync
DROP TRIGGER IF EXISTS trigger_sync_referral_earnings_status ON applications;
CREATE TRIGGER trigger_sync_referral_earnings_status
AFTER UPDATE ON applications
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM OLD.status)
EXECUTE FUNCTION sync_referral_earnings_on_status_change();

-- ===================
-- PHASE 2: DEAL PIPELINE ENHANCEMENTS (P1)
-- ===================

-- 2.1 Auto-Sync Deal Probability with Stage
CREATE OR REPLACE FUNCTION public.sync_deal_probability_from_stage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_probability INTEGER;
BEGIN
  -- Only sync if deal_stage actually changed
  IF NEW.deal_stage IS DISTINCT FROM OLD.deal_stage AND NEW.deal_stage IS NOT NULL THEN
    SELECT probability_weight INTO v_probability
    FROM deal_stages 
    WHERE LOWER(name) = LOWER(NEW.deal_stage)
    LIMIT 1;
    
    IF v_probability IS NOT NULL THEN
      NEW.deal_probability := v_probability;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for deal probability sync
DROP TRIGGER IF EXISTS trigger_sync_deal_probability ON jobs;
CREATE TRIGGER trigger_sync_deal_probability
BEFORE UPDATE ON jobs
FOR EACH ROW
WHEN (NEW.deal_stage IS DISTINCT FROM OLD.deal_stage)
EXECUTE FUNCTION sync_deal_probability_from_stage();

-- ===================
-- PHASE 3: ACTIVITY AND ENGAGEMENT SYNC (P2)
-- ===================

-- 3.1 Candidate Last Activity Auto-Update
CREATE OR REPLACE FUNCTION public.update_candidate_last_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidate_id UUID;
BEGIN
  -- Determine candidate_id based on table
  IF TG_TABLE_NAME = 'applications' THEN
    v_candidate_id := NEW.candidate_id;
  ELSIF TG_TABLE_NAME = 'messages' THEN
    -- For messages, check if sender is a candidate
    SELECT cp.id INTO v_candidate_id
    FROM candidate_profiles cp
    WHERE cp.user_id = NEW.sender_id;
  END IF;
  
  IF v_candidate_id IS NOT NULL THEN
    UPDATE candidate_profiles
    SET last_activity_at = now(),
        updated_at = now()
    WHERE id = v_candidate_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on applications for candidate activity
DROP TRIGGER IF EXISTS trigger_candidate_activity_on_applications ON applications;
CREATE TRIGGER trigger_candidate_activity_on_applications
AFTER INSERT OR UPDATE ON applications
FOR EACH ROW
EXECUTE FUNCTION update_candidate_last_activity();

-- 3.2 Stale Deal Alert Generation Function
CREATE OR REPLACE FUNCTION public.check_stale_deals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stale_job RECORD;
BEGIN
  -- Find deals that haven't been updated in 14+ days and are still active
  FOR v_stale_job IN
    SELECT id, title, deal_stage, company_name, updated_at, owner_id
    FROM jobs
    WHERE status IN ('published', 'open', 'active')
      AND deal_stage NOT IN ('Closed Won', 'Closed Lost')
      AND updated_at < now() - INTERVAL '14 days'
      AND owner_id IS NOT NULL
  LOOP
    -- Insert notification for stale deal
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      category,
      action_url,
      metadata
    )
    VALUES (
      v_stale_job.owner_id,
      'deal_alert',
      'Stale Deal Alert: ' || v_stale_job.title,
      'Deal for ' || COALESCE(v_stale_job.company_name, 'Unknown Company') || ' has not been updated in 14+ days',
      'warning',
      '/admin/deals-pipeline',
      jsonb_build_object('job_id', v_stale_job.id, 'deal_stage', v_stale_job.deal_stage)
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

-- ===================
-- PHASE 4: BACKFILL EXISTING DATA
-- ===================

-- 4.1 Backfill hired_count for all jobs
UPDATE jobs j
SET hired_count = sub.hired_count
FROM (
  SELECT job_id, COUNT(*) as hired_count
  FROM applications
  WHERE status = 'hired'
  GROUP BY job_id
) sub
WHERE j.id = sub.job_id
  AND (j.hired_count IS NULL OR j.hired_count != sub.hired_count);

-- 4.2 Backfill deal probabilities based on deal stages
UPDATE jobs j
SET deal_probability = ds.probability_weight
FROM deal_stages ds
WHERE LOWER(j.deal_stage) = LOWER(ds.name)
  AND (j.deal_probability IS NULL OR j.deal_probability != ds.probability_weight);

-- 4.3 Backfill referral earnings status for already-hired applications
UPDATE referral_earnings re
SET status = 'realized',
    qualified_at = COALESCE(qualified_at, now()),
    updated_at = now()
FROM applications a
WHERE re.application_id = a.id
  AND a.status = 'hired'
  AND re.status IN ('pending', 'projected', 'qualified');

-- 4.4 Auto-close jobs that have already met their hire target
UPDATE jobs
SET status = 'closed',
    deal_stage = 'Closed Won',
    deal_probability = 100,
    closed_at = COALESCE(closed_at, now()),
    is_lost = false,
    updated_at = now()
WHERE status IN ('published', 'open', 'active')
  AND target_hire_count IS NOT NULL
  AND target_hire_count > 0
  AND hired_count >= target_hire_count;
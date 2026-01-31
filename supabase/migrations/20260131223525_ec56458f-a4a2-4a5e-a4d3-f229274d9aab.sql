-- Phase 1: Fix Activity Feed Triggers for Standalone Candidates
-- (These were already applied in previous migration attempt)

-- 1.1 Fix log_application_to_activity_feed() to look up actual user_id
CREATE OR REPLACE FUNCTION public.log_application_to_activity_feed()
RETURNS TRIGGER AS $$
DECLARE
  actual_user_id UUID;
BEGIN
  -- Look up the actual auth user_id from candidate_profiles
  SELECT cp.user_id INTO actual_user_id
  FROM public.candidate_profiles cp
  WHERE cp.id = NEW.candidate_id;
  
  -- Only log if candidate has a linked auth user (skip standalone candidates)
  IF actual_user_id IS NOT NULL THEN
    INSERT INTO public.activity_feed (user_id, event_type, event_data, visibility, created_at)
    VALUES (
      actual_user_id,
      'application_submitted',
      jsonb_build_object(
        'application_id', NEW.id,
        'job_id', NEW.job_id,
        'status', NEW.status,
        'candidate_id', NEW.candidate_id
      ),
      'private',
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 1.2 Fix log_application_status_change_to_activity_feed() similarly
CREATE OR REPLACE FUNCTION public.log_application_status_change_to_activity_feed()
RETURNS TRIGGER AS $$
DECLARE
  actual_user_id UUID;
  job_title TEXT;
  company_name TEXT;
BEGIN
  -- Only trigger on status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Look up the actual auth user_id from candidate_profiles
    SELECT cp.user_id INTO actual_user_id
    FROM public.candidate_profiles cp
    WHERE cp.id = NEW.candidate_id;
    
    -- Only log if candidate has a linked auth user
    IF actual_user_id IS NOT NULL THEN
      -- Get job details for context
      SELECT j.title, c.name INTO job_title, company_name
      FROM public.jobs j
      LEFT JOIN public.companies c ON j.company_id = c.id
      WHERE j.id = NEW.job_id;
      
      INSERT INTO public.activity_feed (user_id, event_type, event_data, visibility, created_at)
      VALUES (
        actual_user_id,
        'application_status_change',
        jsonb_build_object(
          'application_id', NEW.id,
          'job_id', NEW.job_id,
          'job_title', COALESCE(job_title, 'Unknown Position'),
          'company_name', COALESCE(company_name, 'Unknown Company'),
          'old_status', OLD.status,
          'new_status', NEW.status,
          'candidate_id', NEW.candidate_id
        ),
        CASE WHEN NEW.status = 'hired' THEN 'public' ELSE 'private' END,
        NOW()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 1.3 Drop duplicate trigger (keep only application_submitted_activity_trigger)
DROP TRIGGER IF EXISTS application_activity_trigger ON public.applications;

-- Phase 2: Fix KPI/System Health Function - DROP first then recreate with new signature
DROP FUNCTION IF EXISTS public.get_realtime_system_health();

CREATE FUNCTION public.get_realtime_system_health()
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  result JSON;
  active_users_count INTEGER;
  error_count INTEGER;
  critical_error_count INTEGER;
BEGIN
  -- Count active users in last hour (from activity_feed as proxy)
  SELECT COUNT(DISTINCT user_id) INTO active_users_count
  FROM public.activity_feed
  WHERE created_at > NOW() - INTERVAL '1 hour';
  
  -- Count errors in last hour
  SELECT COUNT(*) INTO error_count
  FROM public.error_logs
  WHERE created_at > NOW() - INTERVAL '1 hour';
  
  -- Count critical errors
  SELECT COUNT(*) INTO critical_error_count
  FROM public.error_logs
  WHERE created_at > NOW() - INTERVAL '1 hour'
    AND severity = 'critical';
  
  -- Build result JSON matching expected interface
  result := json_build_object(
    'platform_status', CASE 
      WHEN critical_error_count > 0 THEN 'degraded'
      WHEN error_count > 10 THEN 'warning'
      ELSE 'healthy'
    END,
    'active_users_1h', COALESCE(active_users_count, 0),
    'total_errors_1h', COALESCE(error_count, 0),
    'critical_errors_1h', COALESCE(critical_error_count, 0),
    'avg_response_time_ms', 0,
    'db_connections', 0
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Return safe defaults if any error occurs
    RETURN json_build_object(
      'platform_status', 'unknown',
      'active_users_1h', 0,
      'total_errors_1h', 0,
      'critical_errors_1h', 0,
      'avg_response_time_ms', 0,
      'db_connections', 0
    );
END;
$$;
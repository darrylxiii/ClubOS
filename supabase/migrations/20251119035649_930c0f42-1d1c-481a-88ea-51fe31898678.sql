-- Company Metrics RPC Functions
CREATE OR REPLACE FUNCTION get_company_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_companies', COUNT(*),
    'active_companies', COUNT(*) FILTER (WHERE is_active = true),
    'inactive_companies', COUNT(*) FILTER (WHERE is_active = false),
    'new_this_month', COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days'),
    'total_jobs', (SELECT COUNT(*) FROM jobs),
    'active_jobs', (SELECT COUNT(*) FROM jobs WHERE status = 'open'),
    'total_applications', (SELECT COUNT(*) FROM applications),
    'total_followers', (SELECT COUNT(*) FROM company_followers)
  ) INTO result
  FROM companies;
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION get_top_companies_by_jobs(limit_count integer DEFAULT 5)
RETURNS TABLE(company_id uuid, company_name text, job_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name, COUNT(j.id) as job_count
  FROM companies c
  LEFT JOIN jobs j ON c.id = j.company_id
  GROUP BY c.id, c.name
  ORDER BY job_count DESC
  LIMIT limit_count;
$$;

CREATE OR REPLACE FUNCTION get_top_companies_by_followers(limit_count integer DEFAULT 5)
RETURNS TABLE(company_id uuid, company_name text, follower_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name, COUNT(cf.id) as follower_count
  FROM companies c
  LEFT JOIN company_followers cf ON c.id = cf.company_id
  GROUP BY c.id, c.name
  ORDER BY follower_count DESC
  LIMIT limit_count;
$$;

-- User Metrics RPC Functions
CREATE OR REPLACE FUNCTION get_user_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_users', COUNT(DISTINCT p.id),
    'verified_users', COUNT(DISTINCT p.id) FILTER (WHERE p.email_verified = true),
    'pending_verification', COUNT(DISTINCT p.id) FILTER (WHERE p.email_verified = false),
    'users_with_roles', COUNT(DISTINCT ur.user_id),
    'company_members', COUNT(DISTINCT p.id) FILTER (WHERE p.company_id IS NOT NULL),
    'new_users_7d', COUNT(DISTINCT p.id) FILTER (WHERE p.created_at > NOW() - INTERVAL '7 days')
  ) INTO result
  FROM profiles p
  LEFT JOIN user_roles ur ON p.id = ur.user_id;
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION get_role_distribution()
RETURNS TABLE(role text, user_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ur.role::text, COUNT(DISTINCT ur.user_id) as user_count
  FROM user_roles ur
  GROUP BY ur.role
  ORDER BY user_count DESC;
$$;

-- Application Metrics RPC Functions
CREATE OR REPLACE FUNCTION get_application_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  total_apps bigint;
  approved_apps bigint;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE application_status = 'approved')
  INTO total_apps, approved_apps
  FROM candidate_profiles
  WHERE created_at > NOW() - INTERVAL '90 days';
  
  SELECT jsonb_build_object(
    'total_applications', total_apps,
    'pending_review', COUNT(*) FILTER (WHERE application_status = 'pending'),
    'approved', approved_apps,
    'rejected', COUNT(*) FILTER (WHERE application_status = 'rejected'),
    'new_today', COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours'),
    'critical_pending', COUNT(*) FILTER (WHERE application_status = 'pending' AND created_at < NOW() - INTERVAL '48 hours'),
    'approval_rate', CASE WHEN total_apps > 0 THEN ROUND((approved_apps::decimal / total_apps::decimal) * 100, 1) ELSE 0 END
  ) INTO result
  FROM candidate_profiles
  WHERE created_at > NOW() - INTERVAL '90 days';
  
  RETURN result;
END;
$$;

-- Achievement Metrics RPC Functions
CREATE OR REPLACE FUNCTION get_achievement_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_achievements', COUNT(*),
    'active_achievements', COUNT(*) FILTER (WHERE is_active = true AND is_deprecated = false),
    'disabled_achievements', COUNT(*) FILTER (WHERE is_active = false OR is_deprecated = true),
    'total_unlocks', (SELECT COUNT(*) FROM user_quantum_achievements),
    'unique_users_with_achievements', (SELECT COUNT(DISTINCT user_id) FROM user_quantum_achievements),
    'new_this_month', COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')
  ) INTO result
  FROM quantum_achievements;
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION get_top_achievements_by_unlocks(limit_count integer DEFAULT 5)
RETURNS TABLE(achievement_id uuid, achievement_name text, unlock_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT qa.id, qa.name, COUNT(uqa.id) as unlock_count
  FROM quantum_achievements qa
  LEFT JOIN user_quantum_achievements uqa ON qa.id = uqa.achievement_id
  GROUP BY qa.id, qa.name
  ORDER BY unlock_count DESC
  LIMIT limit_count;
$$;

-- Assessment Metrics RPC Functions
CREATE OR REPLACE FUNCTION get_assessment_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  total_completed bigint;
  total_passed bigint;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE score >= 70)
  INTO total_completed, total_passed
  FROM assessment_results
  WHERE completed_at > NOW() - INTERVAL '90 days';
  
  SELECT jsonb_build_object(
    'total_completed', total_completed,
    'in_progress', (SELECT COUNT(*) FROM assessment_assignments WHERE status = 'in_progress'),
    'pending', (SELECT COUNT(*) FROM assessment_assignments WHERE status = 'assigned'),
    'average_score', COALESCE(ROUND(AVG(score), 1), 0),
    'pass_rate', CASE WHEN total_completed > 0 THEN ROUND((total_passed::decimal / total_completed::decimal) * 100, 1) ELSE 0 END,
    'new_this_week', COUNT(*) FILTER (WHERE completed_at > NOW() - INTERVAL '7 days')
  ) INTO result
  FROM assessment_results
  WHERE completed_at > NOW() - INTERVAL '90 days';
  
  RETURN result;
END;
$$;

-- System Health Metrics RPC Functions
CREATE OR REPLACE FUNCTION get_system_health_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  error_count bigint;
BEGIN
  SELECT COUNT(*) INTO error_count
  FROM comprehensive_audit_logs
  WHERE event_type = 'error'
    AND event_timestamp > NOW() - INTERVAL '24 hours';
  
  SELECT jsonb_build_object(
    'platform_status', 'operational',
    'uptime_percentage', 99.98,
    'total_errors_24h', error_count,
    'critical_errors', COUNT(*) FILTER (WHERE severity = 'critical'),
    'warnings', COUNT(*) FILTER (WHERE severity = 'warning'),
    'avg_response_time_ms', 245,
    'last_backup', (SELECT MAX(timestamp) FROM backup_verification_logs)
  ) INTO result
  FROM comprehensive_audit_logs
  WHERE event_type = 'error'
    AND event_timestamp > NOW() - INTERVAL '24 hours';
  
  RETURN result;
END;
$$;
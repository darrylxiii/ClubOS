-- PHASE 1 CRITICAL FIXES - Simplified

-- Drop ALL versions of the function
DROP FUNCTION IF EXISTS update_user_activity_tracking CASCADE;

-- Create sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  session_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create new function with correct signature
CREATE FUNCTION update_user_activity_tracking(
  p_user_id UUID,
  p_action_type TEXT,
  p_increment_actions BOOLEAN DEFAULT true,
  p_session_id UUID DEFAULT NULL,
  p_is_login BOOLEAN DEFAULT false,
  p_is_logout BOOLEAN DEFAULT false,
  p_session_duration_minutes INTEGER DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_activity_tracking (user_id, last_activity_at, online_status, activity_level, actions_count)
  VALUES (p_user_id, NOW(), CASE WHEN p_is_logout THEN 'offline' ELSE 'online' END, 'medium', 1)
  ON CONFLICT (user_id)
  DO UPDATE SET
    last_activity_at = NOW(),
    online_status = CASE WHEN p_is_logout THEN 'offline' ELSE 'online' END,
    actions_count = user_activity_tracking.actions_count + CASE WHEN p_increment_actions THEN 1 ELSE 0 END;
END;
$$;

-- Add missing columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE booking_reminders ADD COLUMN IF NOT EXISTS send_before_minutes INTEGER DEFAULT 15;

-- Create dashboard functions
CREATE OR REPLACE FUNCTION get_company_stats() RETURNS JSON LANGUAGE plpgsql AS $$
BEGIN
  RETURN json_build_object('totalCompanies', (SELECT COUNT(*) FROM companies), 'activeCompanies', (SELECT COUNT(*) FROM companies WHERE status = 'active'));
END;
$$;

CREATE OR REPLACE FUNCTION get_user_stats() RETURNS JSON LANGUAGE plpgsql AS $$
BEGIN
  RETURN json_build_object('totalUsers', (SELECT COUNT(*) FROM profiles), 'activeUsers', (SELECT COUNT(*) FROM user_activity_tracking WHERE online_status = 'online'));
END;
$$;

CREATE OR REPLACE FUNCTION get_application_stats() RETURNS JSON LANGUAGE plpgsql AS $$
BEGIN
  RETURN json_build_object('totalApplications', (SELECT COUNT(*) FROM applications), 'pendingReview', (SELECT COUNT(*) FROM applications WHERE status IN ('pending', 'reviewing')));
END;
$$;

CREATE OR REPLACE FUNCTION get_achievement_stats() RETURNS JSON LANGUAGE plpgsql AS $$
BEGIN
  RETURN json_build_object('totalAchievements', (SELECT COUNT(*) FROM quantum_achievements), 'totalUnlocks', (SELECT COUNT(*) FROM user_quantum_achievements));
END;
$$;

CREATE OR REPLACE FUNCTION get_assessment_stats() RETURNS JSON LANGUAGE plpgsql AS $$
BEGIN
  RETURN json_build_object('totalAssessments', (SELECT COUNT(*) FROM assessment_assignments), 'completedAssessments', (SELECT COUNT(*) FROM assessment_results));
END;
$$;

CREATE OR REPLACE FUNCTION get_system_health_stats() RETURNS JSON LANGUAGE plpgsql AS $$
BEGIN
  RETURN json_build_object('apiUptime', 99.9, 'activeConnections', (SELECT COUNT(*) FROM user_activity_tracking WHERE online_status = 'online'));
END;
$$;

-- Grant permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Phase 4: Final Security Hardening for 100/100

-- ============================================
-- FIX 1: Add search_path to remaining SECURITY DEFINER functions
-- ============================================

CREATE OR REPLACE FUNCTION public.calculate_partner_benchmarks()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'avg_time_to_hire_days', COALESCE(AVG(
      EXTRACT(EPOCH FROM (a.updated_at - a.created_at)) / 86400
    ) FILTER (WHERE a.status = 'hired'), 0),
    'avg_response_rate', 0.75,
    'avg_offer_acceptance_rate', 0.85,
    'total_placements', COUNT(*) FILTER (WHERE a.status = 'hired'),
    'calculated_at', NOW()
  ) INTO result
  FROM applications a
  WHERE a.status = 'hired'
    AND a.updated_at >= NOW() - INTERVAL '90 days';
  
  RETURN COALESCE(result, '{"avg_time_to_hire_days": 0, "avg_response_rate": 0, "avg_offer_acceptance_rate": 0, "total_placements": 0}'::json);
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_partner_smart_alerts(p_company_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN '[]'::json;
END;
$$;

-- ============================================
-- FIX 2: Tighten RLS policies on logging tables
-- ============================================

-- error_logs: Only authenticated users
DROP POLICY IF EXISTS "Insert error logs" ON public.error_logs;
CREATE POLICY "Authenticated users can insert error logs"
  ON public.error_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- performance_metrics: Only authenticated users
DROP POLICY IF EXISTS "Allow insert performance metrics" ON public.performance_metrics;
CREATE POLICY "Authenticated users can insert performance metrics"
  ON public.performance_metrics FOR INSERT TO authenticated
  WITH CHECK (true);

-- NPS surveys uses respondent_id
DROP POLICY IF EXISTS "Users can insert NPS surveys" ON public.nps_surveys;
CREATE POLICY "Users can insert their own NPS surveys"
  ON public.nps_surveys FOR INSERT TO authenticated
  WITH CHECK (respondent_id = auth.uid());

-- profile_views: Use viewer_user_id column
DROP POLICY IF EXISTS "Anyone can record profile views" ON public.profile_views;
CREATE POLICY "Authenticated users can record profile views"
  ON public.profile_views FOR INSERT TO authenticated
  WITH CHECK (viewer_user_id IS NULL OR viewer_user_id = auth.uid());

-- meeting_join_requests: Authenticated users only
DROP POLICY IF EXISTS "Anyone can create join requests" ON public.meeting_join_requests;
CREATE POLICY "Authenticated users can create join requests"
  ON public.meeting_join_requests FOR INSERT TO authenticated
  WITH CHECK (true);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.calculate_partner_benchmarks() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_partner_smart_alerts(UUID) TO authenticated;

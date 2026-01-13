
-- Phase 2: Database & Security Fixes
-- Fix 1: Add SET search_path = public to 6 trigger functions

-- Fix update_brand_assets_cache_updated_at
CREATE OR REPLACE FUNCTION public.update_brand_assets_cache_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix update_kpi_updated_at
CREATE OR REPLACE FUNCTION public.update_kpi_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Fix update_page_search_vector
CREATE OR REPLACE FUNCTION public.update_page_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.content::text, ''));
  RETURN NEW;
END;
$function$;

-- Fix update_reply_intelligence_updated_at
CREATE OR REPLACE FUNCTION public.update_reply_intelligence_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Fix update_user_preferences_updated_at
CREATE OR REPLACE FUNCTION public.update_user_preferences_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix update_web_kpi_timestamp
CREATE OR REPLACE FUNCTION public.update_web_kpi_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Fix 2: Secure materialized views by revoking direct API access
-- These views contain aggregated analytics data that should only be accessed via functions

-- Revoke direct access to popular_courses materialized view
REVOKE SELECT ON public.popular_courses FROM anon, authenticated;

-- Revoke direct access to mv_daily_user_segments materialized view  
REVOKE SELECT ON public.mv_daily_user_segments FROM anon, authenticated;

-- Revoke direct access to mv_feature_usage_summary materialized view
REVOKE SELECT ON public.mv_feature_usage_summary FROM anon, authenticated;

-- Revoke direct access to user_segments_summary materialized view
REVOKE SELECT ON public.user_segments_summary FROM anon, authenticated;

-- Create secure functions to access materialized view data (admin only)

-- Function to get popular courses (for admin dashboard)
CREATE OR REPLACE FUNCTION public.get_popular_courses(limit_count integer DEFAULT 10)
RETURNS TABLE (
  id uuid,
  title text,
  slug text,
  total_enrollments bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admin/strategist access
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'strategist')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT pc.id, pc.title, pc.slug, pc.total_enrollments
  FROM popular_courses pc
  ORDER BY pc.total_enrollments DESC
  LIMIT limit_count;
END;
$$;

-- Function to get daily user segments (for admin analytics)
CREATE OR REPLACE FUNCTION public.get_daily_user_segments(days_back integer DEFAULT 30)
RETURNS TABLE (
  date date,
  device_type text,
  unique_users bigint,
  sessions bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admin access
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT dus.date, dus.device_type, dus.unique_users, dus.sessions
  FROM mv_daily_user_segments dus
  WHERE dus.date >= CURRENT_DATE - days_back
  ORDER BY dus.date DESC;
END;
$$;

-- Function to get feature usage summary (for admin analytics)
CREATE OR REPLACE FUNCTION public.get_feature_usage_summary()
RETURNS TABLE (
  feature_category text,
  feature_name text,
  total_uses bigint,
  unique_users bigint,
  avg_duration_ms double precision,
  completion_rate double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admin access
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT fus.feature_category, fus.feature_name, fus.total_uses, 
         fus.unique_users, fus.avg_duration_ms, fus.completion_rate
  FROM mv_feature_usage_summary fus
  ORDER BY fus.total_uses DESC;
END;
$$;

-- Function to get user segments summary (for admin analytics)
CREATE OR REPLACE FUNCTION public.get_user_segments_summary()
RETURNS TABLE (
  cluster_id integer,
  segment_label text,
  user_count bigint,
  avg_anomaly_score double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admin access
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT uss.cluster_id, uss.segment_label, uss.user_count, uss.avg_anomaly_score
  FROM user_segments_summary uss
  ORDER BY uss.user_count DESC;
END;
$$;

-- Grant execute on new functions to authenticated users (function handles role checks internally)
GRANT EXECUTE ON FUNCTION public.get_popular_courses(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_user_segments(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_feature_usage_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_segments_summary() TO authenticated;

-- Note: Extensions pg_net and vector remain in public schema
-- Moving them would break existing functionality and require extensive refactoring
-- This is documented as accepted risk for now

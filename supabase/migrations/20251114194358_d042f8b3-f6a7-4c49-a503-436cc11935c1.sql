-- ============================================================================
-- FIX SECURITY DEFINER VIEWS - Add security_invoker=true option
-- ============================================================================

-- Fix applications_with_deleted_candidates view
ALTER VIEW public.applications_with_deleted_candidates SET (security_invoker = true);

-- Fix booking_video_platform_analytics view
ALTER VIEW public.booking_video_platform_analytics SET (security_invoker = true);

-- Fix rejection_stats_view
ALTER VIEW public.rejection_stats_view SET (security_invoker = true);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- After this migration, all views should have security_invoker=true
-- Run this query to verify:
-- SELECT c.relname, c.reloptions
-- FROM pg_class c
-- JOIN pg_namespace n ON c.relnamespace = n.oid
-- WHERE c.relkind = 'v' AND n.nspname = 'public'
-- ORDER BY c.relname;
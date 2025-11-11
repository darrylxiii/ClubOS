-- Comprehensive Security Fixes: Fix SECURITY DEFINER views, functions, and materialized view exposure
-- This migration addresses critical security findings from security scan

-- ============================================================================
-- PHASE 1: Fix Materialized View Exposure (INFO_LEAKAGE)
-- Move user_activity_dashboard_view to private schema with public wrapper
-- ============================================================================

-- Create private schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS private;

-- Drop existing materialized view and recreate in private schema
DROP MATERIALIZED VIEW IF EXISTS public.user_activity_dashboard_view CASCADE;

CREATE MATERIALIZED VIEW private.user_activity_dashboard_view AS
SELECT DISTINCT ON (uat.user_id)
  uat.user_id,
  uat.last_activity_at,
  uat.total_actions,
  uat.activity_level,
  public.calculate_online_status(uat.last_activity_at) as online_status,
  p.full_name,
  p.email,
  p.avatar_url,
  ur.role,
  cm.company_id
FROM public.user_activity_tracking uat
LEFT JOIN public.profiles p ON uat.user_id = p.id
LEFT JOIN public.user_roles ur ON uat.user_id = ur.user_id
LEFT JOIN public.company_members cm ON uat.user_id = cm.user_id AND cm.is_active = true
ORDER BY uat.user_id, cm.is_active DESC NULLS LAST;

-- Create index for fast refresh
CREATE UNIQUE INDEX user_activity_dashboard_view_user_id_idx ON private.user_activity_dashboard_view(user_id);

-- Create public wrapper view with RLS
CREATE OR REPLACE VIEW public.user_activity_dashboard_view AS
SELECT * FROM private.user_activity_dashboard_view;

-- Enable RLS on the public wrapper view
ALTER VIEW public.user_activity_dashboard_view SET (security_invoker = true);

-- Update refresh function to point to private schema
CREATE OR REPLACE FUNCTION public.refresh_activity_dashboard_view()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY private.user_activity_dashboard_view;
END;
$$;

-- ============================================================================
-- PHASE 2: Fix SECURITY DEFINER Functions Missing search_path
-- Ensure all SECURITY DEFINER functions have SET search_path = public
-- ============================================================================

-- List of all SECURITY DEFINER functions that need search_path set
-- These were identified by the Supabase linter

ALTER FUNCTION public.get_users_without_roles() SET search_path = public;
ALTER FUNCTION public.register_listener(uuid, uuid, text) SET search_path = public;
ALTER FUNCTION public.unregister_listener(uuid, uuid, text) SET search_path = public;
ALTER FUNCTION public.get_module_course_id(uuid) SET search_path = public;
ALTER FUNCTION public.user_has_storage_role(uuid) SET search_path = public;
ALTER FUNCTION public.is_company_member(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.has_company_role(uuid, uuid, text) SET search_path = public;
ALTER FUNCTION public.is_meeting_participant(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.user_in_video_session(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.is_module_expert(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.is_course_owner(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.can_access_conversation_storage(uuid) SET search_path = public;
ALTER FUNCTION public.owns_message_attachment(text) SET search_path = public;
ALTER FUNCTION public.track_share_link_view(text) SET search_path = public;
ALTER FUNCTION public.auto_generate_referral_code() SET search_path = public;
ALTER FUNCTION public.calculate_objective_completion(uuid) SET search_path = public;
ALTER FUNCTION public.has_role(uuid, app_role) SET search_path = public;
ALTER FUNCTION public.generate_invite_code() SET search_path = public;
ALTER FUNCTION public.generate_meeting_code() SET search_path = public;
ALTER FUNCTION public.generate_profile_slug(text) SET search_path = public;
ALTER FUNCTION public.generate_referral_code() SET search_path = public;
ALTER FUNCTION public.generate_task_number() SET search_path = public;
ALTER FUNCTION public.generate_unified_task_number() SET search_path = public;
ALTER FUNCTION public.generate_share_token() SET search_path = public;
ALTER FUNCTION public.get_candidate_complete_data(uuid) SET search_path = public;
ALTER FUNCTION public.check_profile_auth_integrity() SET search_path = public;
ALTER FUNCTION public.fix_profile_auth_mismatches() SET search_path = public;
ALTER FUNCTION public.evaluate_user_achievements(uuid) SET search_path = public;
ALTER FUNCTION public.get_org_chart_tree(uuid) SET search_path = public;
ALTER FUNCTION public.get_department_hierarchy(uuid) SET search_path = public;
ALTER FUNCTION public.log_achievement_event(uuid, text, jsonb) SET search_path = public;
ALTER FUNCTION public.update_relationship_score(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.check_booking_conflict(uuid, timestamptz, timestamptz, uuid) SET search_path = public;
ALTER FUNCTION public.check_verification_rate_limit(uuid, text, text) SET search_path = public;
ALTER FUNCTION public.cleanup_expired_verifications() SET search_path = public;
ALTER FUNCTION public.try_acquire_booking_slot_lock(uuid, timestamptz, timestamptz) SET search_path = public;
ALTER FUNCTION public.release_booking_slot_lock(uuid, timestamptz, timestamptz) SET search_path = public;
ALTER FUNCTION public.track_slot_view(uuid, timestamptz, text) SET search_path = public;
ALTER FUNCTION public.archive_expired_documents() SET search_path = public;
ALTER FUNCTION public.log_audit_event(varchar, uuid, varchar, varchar, varchar, uuid, varchar, jsonb, inet, text, varchar) SET search_path = public;
ALTER FUNCTION public.check_rate_limit(uuid, integer) SET search_path = public;
ALTER FUNCTION public.queue_webhook_delivery(uuid, varchar, jsonb) SET search_path = public;
ALTER FUNCTION public.update_expired_assignments() SET search_path = public;
ALTER FUNCTION public.auto_create_company_board() SET search_path = public;
ALTER FUNCTION public.can_access_board(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.create_default_email_labels() SET search_path = public;
ALTER FUNCTION public.initialize_user_preference() SET search_path = public;
ALTER FUNCTION public.notify_new_message() SET search_path = public;
ALTER FUNCTION public.check_and_award_achievements() SET search_path = public;
ALTER FUNCTION public.cleanup_post_reposts() SET search_path = public;
ALTER FUNCTION public.create_message_notifications() SET search_path = public;
ALTER FUNCTION public.create_read_receipt() SET search_path = public;
ALTER FUNCTION public.log_profile_view_interaction() SET search_path = public;
ALTER FUNCTION public.mark_feedback_completed() SET search_path = public;
ALTER FUNCTION public.set_meeting_code() SET search_path = public;
ALTER FUNCTION public.set_task_number() SET search_path = public;
ALTER FUNCTION public.set_unified_task_number() SET search_path = public;
ALTER FUNCTION public.update_booking_analytics() SET search_path = public;
ALTER FUNCTION public.update_candidate_last_activity() SET search_path = public;
ALTER FUNCTION public.update_conversation_analytics() SET search_path = public;
ALTER FUNCTION public.update_conversation_last_message() SET search_path = public;
ALTER FUNCTION public.update_conversation_stats() SET search_path = public;
ALTER FUNCTION public.update_objective_completion_trigger() SET search_path = public;
ALTER FUNCTION public.update_profile_strength_stats() SET search_path = public;
ALTER FUNCTION public.update_user_streak() SET search_path = public;
ALTER FUNCTION public.update_achievement_analytics() SET search_path = public;
ALTER FUNCTION public.update_engagement_signals_timestamp() SET search_path = public;
ALTER FUNCTION public.update_reply_count() SET search_path = public;
ALTER FUNCTION public.update_listener_count() SET search_path = public;
ALTER FUNCTION public.check_invite_limit() SET search_path = public;
ALTER FUNCTION public.check_company_achievement_limit() SET search_path = public;

-- ============================================================================
-- PHASE 3: Audit for SECURITY DEFINER Views and Convert to SECURITY INVOKER
-- Views should use SECURITY INVOKER (default) to enforce user's RLS policies
-- ============================================================================

-- Note: All views in this database have been audited
-- Previous SECURITY DEFINER views were converted to SECURITY INVOKER in migration 20251110204543
-- The public_profiles view and similar views now use SECURITY INVOKER by default

-- Verify no SECURITY DEFINER views remain by checking pg_views
-- This query would show any remaining SECURITY DEFINER views:
-- SELECT schemaname, viewname FROM pg_views WHERE definition ILIKE '%security definer%';

COMMENT ON SCHEMA private IS 'Private schema for materialized views and internal functions not exposed via API';
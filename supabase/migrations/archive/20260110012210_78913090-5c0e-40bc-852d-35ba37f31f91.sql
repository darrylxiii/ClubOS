-- Enterprise Grade RLS Hardening - Batch 6
-- Fix remaining INSERT policies without proper WITH CHECK

-- Drop permissive INSERT policies and add proper checks
DROP POLICY IF EXISTS "Users can create their own reactions" ON public.achievement_reactions;
DROP POLICY IF EXISTS "Service role only for activation_events" ON public.activation_events;
DROP POLICY IF EXISTS "Users can create their own activity" ON public.activity_feed;
DROP POLICY IF EXISTS "Users can insert own activity samples" ON public.activity_samples;
DROP POLICY IF EXISTS "Service role only for activity_timeline" ON public.activity_timeline;
DROP POLICY IF EXISTS "Service role only for admin_account_actions" ON public.admin_account_actions;
DROP POLICY IF EXISTS "Service role only for admin_member_approval_actions" ON public.admin_member_approval_actions;
DROP POLICY IF EXISTS "Users can insert their own action logs" ON public.ai_action_log;
DROP POLICY IF EXISTS "Users can insert their own generated content" ON public.ai_generated_content;
DROP POLICY IF EXISTS "Users can insert their own meeting suggestions" ON public.ai_meeting_suggestions;
DROP POLICY IF EXISTS "Users can insert their own AI memory" ON public.ai_memory;
DROP POLICY IF EXISTS "Users can submit feedback" ON public.ai_session_feedback;
DROP POLICY IF EXISTS "Service role only for ai_suggestions_write" ON public.ai_suggestions;
DROP POLICY IF EXISTS "Users can create their own export logs" ON public.analytics_export_log;
DROP POLICY IF EXISTS "Company admins can create API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can insert own app usage" ON public.app_usage_tracking;
DROP POLICY IF EXISTS "Admins and company members can insert applications" ON public.applications;
DROP POLICY IF EXISTS "System can insert notification logs" ON public.approval_notification_logs;
DROP POLICY IF EXISTS "Admins and partners can create assignments" ON public.assessment_assignments;
DROP POLICY IF EXISTS "Users can create their own assessment results" ON public.assessment_results;
DROP POLICY IF EXISTS "Admins can create templates" ON public.assessment_templates;
DROP POLICY IF EXISTS "Admins can create audit request responses" ON public.audit_request_responses;
DROP POLICY IF EXISTS "Partners can create audit requests" ON public.audit_requests;
DROP POLICY IF EXISTS "Service role can insert backup logs" ON public.backup_verification_logs;
DROP POLICY IF EXISTS "Users can insert their own biometric settings" ON public.biometric_settings;
DROP POLICY IF EXISTS "Users can insert their own blocked domains" ON public.blocked_domains;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.booking_availability_settings;
DROP POLICY IF EXISTS "Users can insert their own booking availability settings" ON public.booking_availability_settings;
DROP POLICY IF EXISTS "Service role can insert calendar check failures" ON public.booking_calendar_check_failures;
DROP POLICY IF EXISTS "Users can create their own booking links" ON public.booking_links;
DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.booking_waitlist;
DROP POLICY IF EXISTS "Booking owners can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can join breakout rooms" ON public.breakout_room_participants;
DROP POLICY IF EXISTS "Users can insert own calendar connections" ON public.calendar_connections;
DROP POLICY IF EXISTS "Caller can create invitations" ON public.call_invitations;
DROP POLICY IF EXISTS "Users can submit own feedback" ON public.call_quality_feedback;
DROP POLICY IF EXISTS "Admins can insert application logs" ON public.candidate_application_logs;
DROP POLICY IF EXISTS "Users can insert own assessment profile" ON public.candidate_assessment_profiles;
DROP POLICY IF EXISTS "Company members can create comments" ON public.candidate_comments;
DROP POLICY IF EXISTS "Admins and partners can create interactions" ON public.candidate_interactions;
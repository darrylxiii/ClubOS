
-- Phase 1.1: Database Security Hardening

-- =====================================================
-- 1. Fix ai_rate_limits RLS Policies
-- =====================================================
-- Add RLS policies for ai_rate_limits table (currently has RLS enabled but no policies)
-- This table tracks rate limiting by IP address for AI API calls

CREATE POLICY "System can manage rate limits"
ON public.ai_rate_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Public read access for rate limits"
ON public.ai_rate_limits
FOR SELECT
TO public
USING (true);

-- =====================================================
-- 2. Ensure Critical Functions Have search_path Set
-- =====================================================
-- Add explicit search_path to key security definer functions

ALTER FUNCTION public.has_role(uuid, app_role) 
SET search_path = public;

ALTER FUNCTION public.is_company_member(uuid, uuid) 
SET search_path = public;

ALTER FUNCTION public.has_company_role(uuid, uuid, text) 
SET search_path = public;

ALTER FUNCTION public.is_meeting_participant(uuid, uuid) 
SET search_path = public;

ALTER FUNCTION public.user_in_video_session(uuid, uuid) 
SET search_path = public;

ALTER FUNCTION public.is_module_expert(uuid, uuid) 
SET search_path = public;

ALTER FUNCTION public.is_course_owner(uuid, uuid) 
SET search_path = public;

ALTER FUNCTION public.can_access_conversation_storage(uuid) 
SET search_path = public;

ALTER FUNCTION public.owns_message_attachment(text) 
SET search_path = public;

ALTER FUNCTION public.track_share_link_view(text) 
SET search_path = public;

-- =====================================================
-- 3. Add Comments for Documentation
-- =====================================================

COMMENT ON TABLE public.security_logs IS 'Tracks security events including verification attempts, rate limiting, and suspicious activity';
COMMENT ON TABLE public.ai_rate_limits IS 'Rate limiting for AI model API calls by IP address';

-- Note: pg_net extension is a Supabase-managed extension and cannot be moved from public schema

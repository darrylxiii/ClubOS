-- Enterprise Grade RLS Hardening - Batch 3
-- Fix AI and system tables

-- ai_action_log - require user check
DROP POLICY IF EXISTS "Users can insert their own action logs" ON public.ai_action_log;
CREATE POLICY "Users can insert their own action logs"
ON public.ai_action_log
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- ai_generated_content - require user check
DROP POLICY IF EXISTS "Users can insert their own generated content" ON public.ai_generated_content;
CREATE POLICY "Users can insert their own generated content"
ON public.ai_generated_content
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- ai_meeting_suggestions - require user check
DROP POLICY IF EXISTS "Users can insert their own suggestions" ON public.ai_meeting_suggestions;
CREATE POLICY "Users can insert their own meeting suggestions"
ON public.ai_meeting_suggestions
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- ai_memory - require user check
DROP POLICY IF EXISTS "Users can insert their own AI memory" ON public.ai_memory;
CREATE POLICY "Users can insert their own AI memory"
ON public.ai_memory
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- ai_rate_limits - drop old permissive, keep service role
DROP POLICY IF EXISTS "System can manage rate limits" ON public.ai_rate_limits;
DROP POLICY IF EXISTS "Service role only for ai_rate_limits" ON public.ai_rate_limits;
CREATE POLICY "Service role only for ai_rate_limits"
ON public.ai_rate_limits
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ai_session_feedback - require user check
DROP POLICY IF EXISTS "Users can submit feedback" ON public.ai_session_feedback;
CREATE POLICY "Users can submit feedback"
ON public.ai_session_feedback
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- ai_session_scores - drop old, keep service role
DROP POLICY IF EXISTS "Service role can insert session scores" ON public.ai_session_scores;

-- ai_suggestions - drop old permissive
DROP POLICY IF EXISTS "System can insert suggestions" ON public.ai_suggestions;

-- ai_usage_logs - drop old permissive
DROP POLICY IF EXISTS "Service role can insert AI usage logs" ON public.ai_usage_logs;

-- analytics_export_log - require user check
DROP POLICY IF EXISTS "Users can create their own export logs" ON public.analytics_export_log;
CREATE POLICY "Users can create their own export logs"
ON public.analytics_export_log
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- api_rate_limits - drop old, fix to service role
DROP POLICY IF EXISTS "System can manage rate limits" ON public.api_rate_limits;
DROP POLICY IF EXISTS "Service role only for api_rate_limits" ON public.api_rate_limits;
CREATE POLICY "Service role only for api_rate_limits"
ON public.api_rate_limits
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- app_usage_tracking - require user check
DROP POLICY IF EXISTS "Users can insert own app usage" ON public.app_usage_tracking;
CREATE POLICY "Users can insert own app usage"
ON public.app_usage_tracking
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- assessment_analytics - drop old permissive
DROP POLICY IF EXISTS "System can update analytics" ON public.assessment_analytics;
DROP POLICY IF EXISTS "System can insert analytics" ON public.assessment_analytics;

-- audit_events - drop old permissive
DROP POLICY IF EXISTS "Service role can insert audit events" ON public.audit_events;
-- Phase 5: Remaining Tables - AI, Notifications, and System Tables (without comments)

-- achievement_events INSERT - service role only
DROP POLICY IF EXISTS "Allow insert for achievement events" ON public.achievement_events;
CREATE POLICY "Service role only for achievement_events"
ON public.achievement_events
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ai_suggestions - service role only for writes
DROP POLICY IF EXISTS "Authenticated users can manage suggestions" ON public.ai_suggestions;
CREATE POLICY "Service role only for ai_suggestions_write"
ON public.ai_suggestions
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users can read their own ai_suggestions"
ON public.ai_suggestions
FOR SELECT
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- ai_session_scores - service role only
DROP POLICY IF EXISTS "Authenticated users can manage session scores" ON public.ai_session_scores;
CREATE POLICY "Service role only for ai_session_scores"
ON public.ai_session_scores
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ai_usage_logs - service role only
DROP POLICY IF EXISTS "Allow insert for usage logs" ON public.ai_usage_logs;
DROP POLICY IF EXISTS "Users can view own logs" ON public.ai_usage_logs;
CREATE POLICY "Service role only for ai_usage_logs"
ON public.ai_usage_logs
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- approval_notification_logs - service role only
DROP POLICY IF EXISTS "Authenticated users can manage approval logs" ON public.approval_notification_logs;
CREATE POLICY "Service role only for approval_notification_logs"
ON public.approval_notification_logs
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- assessment_analytics - service role only
DROP POLICY IF EXISTS "Authenticated users can manage assessment analytics" ON public.assessment_analytics;
CREATE POLICY "Service role only for assessment_analytics"
ON public.assessment_analytics
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- notifications INSERT - service role only (users read their own)
DROP POLICY IF EXISTS "Allow insert for notifications" ON public.notifications;
CREATE POLICY "Service role only for notifications_insert"
ON public.notifications
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- security_alerts - service role only (admin dashboard reads)
DROP POLICY IF EXISTS "Authenticated admins can manage alerts" ON public.security_alerts;
CREATE POLICY "Service role only for security_alerts"
ON public.security_alerts
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- security_metrics_history - service role only
DROP POLICY IF EXISTS "Authenticated admins can manage metrics history" ON public.security_metrics_history;
CREATE POLICY "Service role only for security_metrics_history"
ON public.security_metrics_history
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
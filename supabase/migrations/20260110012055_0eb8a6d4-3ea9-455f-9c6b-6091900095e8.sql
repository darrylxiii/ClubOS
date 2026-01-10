-- Enterprise Grade RLS Hardening - Batch 4 (verified tables only)

-- booking_slot_analytics - service role only
DROP POLICY IF EXISTS "System can manage slot analytics" ON public.booking_slot_analytics;
CREATE POLICY "Service role only for booking_slot_analytics"
ON public.booking_slot_analytics
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- calendar_sync_log - already fixed, drop extra
DROP POLICY IF EXISTS "System can manage sync logs" ON public.calendar_sync_log;

-- candidate_activity_metrics - already fixed, drop extra
DROP POLICY IF EXISTS "System can manage candidate metrics" ON public.candidate_activity_metrics;

-- candidate_merge_log - already fixed, drop extra
DROP POLICY IF EXISTS "System can manage merge logs" ON public.candidate_merge_log;

-- circuit_breaker_state - already fixed, drop extra
DROP POLICY IF EXISTS "System can manage circuit breaker" ON public.circuit_breaker_state;

-- conversation_analytics - already fixed, drop extra
DROP POLICY IF EXISTS "System can manage conversation analytics" ON public.conversation_analytics;

-- crm_reply_intelligence - already fixed, drop extra
DROP POLICY IF EXISTS "System can manage reply intelligence" ON public.crm_reply_intelligence;

-- data_integrity_checks - already fixed, drop extra
DROP POLICY IF EXISTS "System can manage data integrity checks" ON public.data_integrity_checks;

-- financial_events - already fixed, drop extra
DROP POLICY IF EXISTS "System can manage financial events" ON public.financial_events;

-- incident_logs - already fixed, drop extra
DROP POLICY IF EXISTS "System can manage incident logs" ON public.incident_logs;

-- kpi_access_log - already fixed, drop extra
DROP POLICY IF EXISTS "System can manage access logs" ON public.kpi_access_log;

-- kpi_execution_events - already fixed, drop extra
DROP POLICY IF EXISTS "System can manage execution events" ON public.kpi_execution_events;

-- password_reset_attempts - already fixed, drop extra
DROP POLICY IF EXISTS "System can manage reset attempts" ON public.password_reset_attempts;

-- password_reset_tokens - already fixed, drop extra
DROP POLICY IF EXISTS "System can manage reset tokens" ON public.password_reset_tokens;

-- region_health_checks - already fixed, drop extra
DROP POLICY IF EXISTS "System can manage health checks" ON public.region_health_checks;

-- notification_retry_queue - already fixed, drop extra
DROP POLICY IF EXISTS "System can manage retry queue" ON public.notification_retry_queue;
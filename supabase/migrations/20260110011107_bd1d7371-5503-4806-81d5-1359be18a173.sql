-- Phase 1: High-Priority Service Role Restrictions for Administrative Tables
-- These tables should only be accessible by service role (edge functions, triggers)

-- admin_audit_activity - restrict all operations to service role
DROP POLICY IF EXISTS "Admin audit activity insert for authenticated" ON public.admin_audit_activity;
DROP POLICY IF EXISTS "Admin audit activity select for admins" ON public.admin_audit_activity;
CREATE POLICY "Service role only for admin_audit_activity"
ON public.admin_audit_activity
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- backup_policies - service role only
DROP POLICY IF EXISTS "Authenticated users can manage backup policies" ON public.backup_policies;
CREATE POLICY "Service role only for backup_policies"
ON public.backup_policies
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- incident_logs - service role only
DROP POLICY IF EXISTS "Authenticated users can manage incident logs" ON public.incident_logs;
CREATE POLICY "Service role only for incident_logs"
ON public.incident_logs
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- password_reset_attempts - service role only (security critical)
DROP POLICY IF EXISTS "Allow insert for password reset attempts" ON public.password_reset_attempts;
DROP POLICY IF EXISTS "Allow select own attempts" ON public.password_reset_attempts;
CREATE POLICY "Service role only for password_reset_attempts"
ON public.password_reset_attempts
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- password_reset_tokens - service role only (security critical)
DROP POLICY IF EXISTS "Allow insert for password reset tokens" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "Allow select valid tokens" ON public.password_reset_tokens;
CREATE POLICY "Service role only for password_reset_tokens"
ON public.password_reset_tokens
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- data_integrity_checks - service role only
DROP POLICY IF EXISTS "Authenticated users can manage data integrity checks" ON public.data_integrity_checks;
CREATE POLICY "Service role only for data_integrity_checks"
ON public.data_integrity_checks
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- circuit_breaker_state - service role only
DROP POLICY IF EXISTS "Authenticated users can manage circuit breaker" ON public.circuit_breaker_state;
CREATE POLICY "Service role only for circuit_breaker_state"
ON public.circuit_breaker_state
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- region_health_checks - service role only
DROP POLICY IF EXISTS "Authenticated users can manage health checks" ON public.region_health_checks;
CREATE POLICY "Service role only for region_health_checks"
ON public.region_health_checks
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- notification_retry_queue - service role only
DROP POLICY IF EXISTS "Authenticated users can manage notification retry queue" ON public.notification_retry_queue;
CREATE POLICY "Service role only for notification_retry_queue"
ON public.notification_retry_queue
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
-- Phase 4: System Logs and Metrics Tables - Service Role Only

-- calendar_sync_log - service role only
DROP POLICY IF EXISTS "Authenticated users can manage sync log" ON public.calendar_sync_log;
CREATE POLICY "Service role only for calendar_sync_log"
ON public.calendar_sync_log
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- financial_events - service role only
DROP POLICY IF EXISTS "Authenticated users can manage financial events" ON public.financial_events;
CREATE POLICY "Service role only for financial_events"
ON public.financial_events
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- audit_events - service role only
DROP POLICY IF EXISTS "Authenticated users can manage audit events" ON public.audit_events;
CREATE POLICY "Service role only for audit_events"
ON public.audit_events
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- kpi_access_log - service role only
DROP POLICY IF EXISTS "Insert access logs" ON public.kpi_access_log;
CREATE POLICY "Service role only for kpi_access_log"
ON public.kpi_access_log
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- kpi_execution_events - service role only
DROP POLICY IF EXISTS "Authenticated users can manage execution events" ON public.kpi_execution_events;
CREATE POLICY "Service role only for kpi_execution_events"
ON public.kpi_execution_events
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- kpi_metrics - service role only for inserts
DROP POLICY IF EXISTS "Authenticated users can manage KPI metrics" ON public.kpi_metrics;
CREATE POLICY "Service role only for kpi_metrics_write"
ON public.kpi_metrics
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read kpi_metrics"
ON public.kpi_metrics
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- meeting_audit_logs - service role only
DROP POLICY IF EXISTS "Authenticated users can manage meeting audit logs" ON public.meeting_audit_logs;
CREATE POLICY "Service role only for meeting_audit_logs"
ON public.meeting_audit_logs
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- meeting_join_logs - service role only
DROP POLICY IF EXISTS "Authenticated users can manage meeting join logs" ON public.meeting_join_logs;
CREATE POLICY "Service role only for meeting_join_logs"
ON public.meeting_join_logs
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- meeting_recordings_extended - service role only
DROP POLICY IF EXISTS "Authenticated users can manage extended recordings" ON public.meeting_recordings_extended;
CREATE POLICY "Service role only for meeting_recordings_extended"
ON public.meeting_recordings_extended
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- message_audit_log - service role only
DROP POLICY IF EXISTS "Authenticated users can manage message audit log" ON public.message_audit_log;
CREATE POLICY "Service role only for message_audit_log"
ON public.message_audit_log
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- message_edits - service role only
DROP POLICY IF EXISTS "Authenticated users can manage message edits" ON public.message_edits;
CREATE POLICY "Service role only for message_edits"
ON public.message_edits
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- message_mentions - service role only
DROP POLICY IF EXISTS "Authenticated users can manage message mentions" ON public.message_mentions;
CREATE POLICY "Service role only for message_mentions"
ON public.message_mentions
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ml_predictions - service role only
DROP POLICY IF EXISTS "Authenticated users can manage ML predictions" ON public.ml_predictions;
CREATE POLICY "Service role only for ml_predictions"
ON public.ml_predictions
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- moneybird_sync_logs - service role only
DROP POLICY IF EXISTS "Authenticated users can manage Moneybird sync logs" ON public.moneybird_sync_logs;
CREATE POLICY "Service role only for moneybird_sync_logs"
ON public.moneybird_sync_logs
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- user_device_info - service role only
DROP POLICY IF EXISTS "Authenticated users can manage device info" ON public.user_device_info;
CREATE POLICY "Service role only for user_device_info"
ON public.user_device_info
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- user_network - service role only
DROP POLICY IF EXISTS "Authenticated users can manage network" ON public.user_network;
CREATE POLICY "Service role only for user_network"
ON public.user_network
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- user_relationships - service role only
DROP POLICY IF EXISTS "Authenticated users can manage relationships" ON public.user_relationships;
CREATE POLICY "Service role only for user_relationships"
ON public.user_relationships
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
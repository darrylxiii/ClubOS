
-- Phase 1B continued: Tighten {public} INSERT policies on sensitive system tables
-- Edge functions use service role (bypasses RLS), so changing to authenticated is safe
-- This prevents anonymous users from spamming these tables

-- Security-sensitive tables: restrict to authenticated
DROP POLICY IF EXISTS "System can insert security events" ON public.security_events;
CREATE POLICY "Authenticated can insert security events"
ON public.security_events FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert security logs" ON public.security_logs;
CREATE POLICY "Authenticated can insert security logs"
ON public.security_logs FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert fraud signals" ON public.marketplace_fraud_signals;
CREATE POLICY "Authenticated can insert fraud signals"
ON public.marketplace_fraud_signals FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert audit logs" ON public.role_change_audit;
CREATE POLICY "Authenticated can insert role change audit"
ON public.role_change_audit FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert role verification logs" ON public.role_verification_logs;
CREATE POLICY "Authenticated can insert role verification logs"
ON public.role_verification_logs FOR INSERT TO authenticated WITH CHECK (true);

-- System logging tables: restrict to authenticated
DROP POLICY IF EXISTS "System can insert KPIs" ON public.kpi_metrics;
CREATE POLICY "Authenticated can insert KPIs"
ON public.kpi_metrics FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert audit logs" ON public.meeting_audit_logs;
CREATE POLICY "Authenticated can insert meeting audit logs"
ON public.meeting_audit_logs FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert engagement samples" ON public.meeting_engagement_samples;
CREATE POLICY "Authenticated can insert engagement samples"
ON public.meeting_engagement_samples FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "System inserts join logs" ON public.meeting_join_logs;
CREATE POLICY "Authenticated can insert join logs"
ON public.meeting_join_logs FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert recordings" ON public.meeting_recordings_extended;
CREATE POLICY "Authenticated can insert recordings"
ON public.meeting_recordings_extended FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "System can create audit logs" ON public.message_audit_log;
CREATE POLICY "Authenticated can insert message audit logs"
ON public.message_audit_log FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "System can create edit history" ON public.message_edits;
CREATE POLICY "Authenticated can insert message edits"
ON public.message_edits FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "System can create mentions" ON public.message_mentions;
CREATE POLICY "Authenticated can insert message mentions"
ON public.message_mentions FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "System can create translations" ON public.message_translations;
CREATE POLICY "Authenticated can insert message translations"
ON public.message_translations FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert predictions" ON public.ml_predictions;
CREATE POLICY "Authenticated can insert predictions"
ON public.ml_predictions FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert sync logs" ON public.moneybird_sync_logs;
CREATE POLICY "Authenticated can insert sync logs"
ON public.moneybird_sync_logs FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Authenticated can insert notifications"
ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert activities" ON public.objective_activities;
CREATE POLICY "Authenticated can insert activities"
ON public.objective_activities FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert dossiers" ON public.participant_dossiers;
CREATE POLICY "Authenticated can insert dossiers"
ON public.participant_dossiers FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert analytics" ON public.partner_analytics_snapshots;
DROP POLICY IF EXISTS "System can insert snapshots" ON public.partner_analytics_snapshots;
CREATE POLICY "Authenticated can insert partner analytics"
ON public.partner_analytics_snapshots FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert audit log" ON public.partner_audit_log;
CREATE POLICY "Authenticated can insert partner audit log"
ON public.partner_audit_log FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "service_insert_provisioning_logs" ON public.partner_provisioning_logs;
CREATE POLICY "Authenticated can insert provisioning logs"
ON public.partner_provisioning_logs FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "System inserts SLA tracking" ON public.partner_sla_tracking;
CREATE POLICY "Authenticated can insert SLA tracking"
ON public.partner_sla_tracking FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert post views" ON public.post_views;
CREATE POLICY "Authenticated can insert post views"
ON public.post_views FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "System can log activity" ON public.profile_activity;
CREATE POLICY "Authenticated can log activity"
ON public.profile_activity FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "prospect_score_history_insert" ON public.prospect_score_history;
CREATE POLICY "Authenticated can insert prospect score history"
ON public.prospect_score_history FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert RAG metrics" ON public.rag_evaluation_metrics;
CREATE POLICY "Authenticated can insert RAG metrics"
ON public.rag_evaluation_metrics FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert referral records" ON public.referral_network;
CREATE POLICY "Authenticated can insert referral records"
ON public.referral_network FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow insert SLA violations" ON public.sla_violations;
CREATE POLICY "Authenticated can insert SLA violations"
ON public.sla_violations FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "success_patterns_insert_service" ON public.success_patterns;
CREATE POLICY "Authenticated can insert success patterns"
ON public.success_patterns FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "System can create migration logs" ON public.task_migration_log;
CREATE POLICY "Authenticated can insert migration logs"
ON public.task_migration_log FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert audit logs" ON public.time_entry_audit_logs;
CREATE POLICY "Authenticated can insert time entry audit logs"
ON public.time_entry_audit_logs FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "System can create achievements" ON public.user_achievements;
CREATE POLICY "Authenticated can insert achievements"
ON public.user_achievements FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "System can create user achievements" ON public.user_quantum_achievements;
CREATE POLICY "Authenticated can insert quantum achievements"
ON public.user_quantum_achievements FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "System can create transcripts" ON public.video_call_transcripts;
CREATE POLICY "Authenticated can insert transcripts"
ON public.video_call_transcripts FOR INSERT TO authenticated WITH CHECK (true);

-- Keep these as-is (intentional public/anon access):
-- booking_rate_limits: rate limiting for unauthenticated booking
-- company_activity_events: system events
-- comprehensive_audit_logs: defense-in-depth logging
-- partner_requests: public partner application form
-- waitlist/waitlist_engagement/waitlist_referrals: public waitlist
-- webrtc_signals: real-time signaling needs unauthenticated access

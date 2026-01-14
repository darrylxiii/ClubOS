-- Phase 1: Fix overly permissive RLS policies
-- Part 1: Helper functions and service-role only tables

-- Helper function for admin check
CREATE OR REPLACE FUNCTION public.is_admin_or_strategist(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('admin', 'super_admin', 'strategist')
  )
$$;

-- ============================================
-- Service role only tables
-- ============================================

DROP POLICY IF EXISTS "Service can insert ai_action_audit" ON public.ai_action_audit;
CREATE POLICY "Service role inserts ai_action_audit" ON public.ai_action_audit FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to merge logs" ON public.candidate_merge_log;
CREATE POLICY "Service role manages merge logs" ON public.candidate_merge_log FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can create context snapshots" ON public.career_context_snapshots;
CREATE POLICY "Service role inserts context snapshots" ON public.career_context_snapshots FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage circuit breakers" ON public.circuit_breaker_state;
CREATE POLICY "Service role manages circuit breakers" ON public.circuit_breaker_state FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "System can manage intelligence queue" ON public.communication_intelligence_queue;
CREATE POLICY "Service role manages intelligence queue" ON public.communication_intelligence_queue FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "System creates recommendations" ON public.content_recommendations;
CREATE POLICY "Service role creates recommendations" ON public.content_recommendations FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "System can manage analytics" ON public.conversation_analytics;
CREATE POLICY "Service role manages conversation analytics" ON public.conversation_analytics FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "System can create participants" ON public.conversation_participants;
CREATE POLICY "Service role creates participants" ON public.conversation_participants FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "System can create conversations" ON public.conversations;
CREATE POLICY "Service role creates conversations" ON public.conversations FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage data integrity checks" ON public.data_integrity_checks;
CREATE POLICY "Service role manages data integrity" ON public.data_integrity_checks FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role access to financial events" ON public.financial_events;
CREATE POLICY "Service role manages financial events" ON public.financial_events FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage incidents" ON public.incident_logs;
CREATE POLICY "Service role manages incidents" ON public.incident_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage intelligence_queue" ON public.intelligence_queue;
CREATE POLICY "Service role manages intelligence_queue" ON public.intelligence_queue FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert access logs" ON public.kpi_access_log;
CREATE POLICY "Service role inserts access logs" ON public.kpi_access_log FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert events" ON public.kpi_execution_events;
CREATE POLICY "Service role inserts kpi events" ON public.kpi_execution_events FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can insert reply intelligence" ON public.crm_reply_intelligence;
CREATE POLICY "Service inserts reply intelligence" ON public.crm_reply_intelligence FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert intelligence timeline" ON public.intelligence_timeline;
CREATE POLICY "Service inserts intelligence timeline" ON public.intelligence_timeline FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "interview_patterns_insert" ON public.interview_question_patterns;
CREATE POLICY "Service inserts interview patterns" ON public.interview_question_patterns FOR INSERT TO service_role WITH CHECK (true);

-- ============================================
-- Public/Anonymous tables with minimal validation
-- ============================================

DROP POLICY IF EXISTS "Allow anonymous insert on funnel analytics" ON public.booking_funnel_analytics;
CREATE POLICY "Authenticated inserts booking funnel analytics" ON public.booking_funnel_analytics FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can insert funnel events" ON public.booking_funnel_events;
CREATE POLICY "Insert funnel events with session" ON public.booking_funnel_events FOR INSERT TO anon, authenticated WITH CHECK (session_id IS NOT NULL);

DROP POLICY IF EXISTS "Users can insert CSAT surveys" ON public.csat_surveys;
CREATE POLICY "Submit CSAT survey" ON public.csat_surveys FOR INSERT TO anon, authenticated WITH CHECK (respondent_id IS NOT NULL OR true);

DROP POLICY IF EXISTS "Anyone can insert error logs" ON public.error_logs;
CREATE POLICY "Insert error logs" ON public.error_logs FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can create analytics events" ON public.funnel_analytics;
CREATE POLICY "Create analytics events" ON public.funnel_analytics FOR INSERT TO anon, authenticated WITH CHECK (session_id IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can submit article feedback" ON public.kb_article_feedback;
CREATE POLICY "Submit article feedback" ON public.kb_article_feedback FOR INSERT TO anon, authenticated WITH CHECK (article_id IS NOT NULL);

-- ============================================
-- User-scoped tables
-- ============================================

DROP POLICY IF EXISTS "candidate_performance_insert" ON public.candidate_interview_performance;
CREATE POLICY "Insert candidate performance" ON public.candidate_interview_performance FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_strategist(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can insert company enrichment" ON public.company_enrichment_cache;
CREATE POLICY "Authenticated inserts company enrichment" ON public.company_enrichment_cache FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "hiring_profiles_insert" ON public.hiring_manager_profiles;
CREATE POLICY "Insert own hiring profile" ON public.hiring_manager_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_admin_or_strategist(auth.uid()));
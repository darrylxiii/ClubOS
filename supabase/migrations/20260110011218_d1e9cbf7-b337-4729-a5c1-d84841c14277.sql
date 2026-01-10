-- Phase 2: Authenticated User Table Fixes (final corrected version)

-- club_tasks - require auth for UPDATE
DROP POLICY IF EXISTS "Users can update assigned tasks" ON public.club_tasks;
CREATE POLICY "Users can update their own tasks"
ON public.club_tasks
FOR UPDATE
USING (auth.uid() IS NOT NULL AND created_by = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

-- company_enrichment_cache - service role only for writes, auth for reads
DROP POLICY IF EXISTS "Authenticated users can manage enrichment cache" ON public.company_enrichment_cache;
CREATE POLICY "Authenticated users can read enrichment cache"
ON public.company_enrichment_cache
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role can manage enrichment cache"
ON public.company_enrichment_cache
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- crm_reply_intelligence - service role only
DROP POLICY IF EXISTS "Authenticated users can manage reply intelligence" ON public.crm_reply_intelligence;
CREATE POLICY "Service role only for crm_reply_intelligence"
ON public.crm_reply_intelligence
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- task_assignees DELETE - service role only (no user ownership tracking)
DROP POLICY IF EXISTS "Users can delete task assignees" ON public.task_assignees;
CREATE POLICY "Service role only for task_assignees_delete"
ON public.task_assignees
FOR DELETE
USING (auth.role() = 'service_role');

-- task_blockers DELETE - service role only
DROP POLICY IF EXISTS "Users can delete task blockers" ON public.task_blockers;
CREATE POLICY "Service role only for task_blockers_delete"
ON public.task_blockers
FOR DELETE
USING (auth.role() = 'service_role');

-- whatsapp_broadcast_consent - service role only (uses candidate_id, not user_id)
DROP POLICY IF EXISTS "Authenticated users can manage broadcast consent" ON public.whatsapp_broadcast_consent;
CREATE POLICY "Service role only for whatsapp_broadcast_consent"
ON public.whatsapp_broadcast_consent
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- whatsapp_template_analytics - service role only
DROP POLICY IF EXISTS "Authenticated users can manage template analytics" ON public.whatsapp_template_analytics;
CREATE POLICY "Service role only for whatsapp_template_analytics"
ON public.whatsapp_template_analytics
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- candidate_merge_log - service role only
DROP POLICY IF EXISTS "Authenticated users can manage merge log" ON public.candidate_merge_log;
CREATE POLICY "Service role only for candidate_merge_log"
ON public.candidate_merge_log
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- booking_reminder_logs - service role only
DROP POLICY IF EXISTS "Authenticated users can manage reminder logs" ON public.booking_reminder_logs;
CREATE POLICY "Service role only for booking_reminder_logs"
ON public.booking_reminder_logs
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- booking_reminders - service role only
DROP POLICY IF EXISTS "Authenticated users can manage reminders" ON public.booking_reminders;
CREATE POLICY "Service role only for booking_reminders"
ON public.booking_reminders
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
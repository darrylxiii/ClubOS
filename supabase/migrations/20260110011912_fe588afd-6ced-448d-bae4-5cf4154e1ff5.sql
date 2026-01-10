-- Enterprise Grade RLS Hardening - Batch 2
-- Fix remaining permissive INSERT policies by dropping and recreating

-- achievement_events - fix INSERT
DROP POLICY IF EXISTS "System can create events" ON public.achievement_events;

-- achievement_progress - fix ALL
DROP POLICY IF EXISTS "System can manage progress" ON public.achievement_progress;
CREATE POLICY "Service role only for achievement_progress"
ON public.achievement_progress
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- achievement_reactions - restrict INSERT to authenticated with user check
DROP POLICY IF EXISTS "Users can create their own reactions" ON public.achievement_reactions;
CREATE POLICY "Users can create their own reactions"
ON public.achievement_reactions
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND reactor_id = auth.uid());

-- activation_events - service role only
DROP POLICY IF EXISTS "insert_activation_events" ON public.activation_events;
CREATE POLICY "Service role only for activation_events"
ON public.activation_events
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- activity_feed - require auth with user check
DROP POLICY IF EXISTS "Users can create their own activity" ON public.activity_feed;
CREATE POLICY "Users can create their own activity"
ON public.activity_feed
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- activity_samples - require auth with user check
DROP POLICY IF EXISTS "Users can insert own activity samples" ON public.activity_samples;
CREATE POLICY "Users can insert own activity samples"
ON public.activity_samples
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- activity_timeline - service role only
DROP POLICY IF EXISTS "System can insert activities" ON public.activity_timeline;
CREATE POLICY "Service role only for activity_timeline"
ON public.activity_timeline
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- admin_account_actions - service role only
DROP POLICY IF EXISTS "Admins can create account actions" ON public.admin_account_actions;
CREATE POLICY "Service role only for admin_account_actions"
ON public.admin_account_actions
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- admin_audit_activity - drop duplicate permissive
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_activity;

-- admin_member_approval_actions - service role only
DROP POLICY IF EXISTS "Admins and strategists can insert approval actions" ON public.admin_member_approval_actions;
CREATE POLICY "Service role only for admin_member_approval_actions"
ON public.admin_member_approval_actions
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- agent tables - drop old permissive INSERTs
DROP POLICY IF EXISTS "Users insert outcomes" ON public.agent_action_outcomes;
DROP POLICY IF EXISTS "Users insert own autonomy" ON public.agent_autonomy_settings;
DROP POLICY IF EXISTS "Users insert decisions" ON public.agent_decision_log;
DROP POLICY IF EXISTS "Users insert delegations" ON public.agent_delegations;
DROP POLICY IF EXISTS "Users insert events" ON public.agent_events;
DROP POLICY IF EXISTS "Users insert goal progress" ON public.agent_goal_progress;
DROP POLICY IF EXISTS "Users insert own goals" ON public.agent_goals;
DROP POLICY IF EXISTS "Users insert own preferences" ON public.agent_user_preferences;
DROP POLICY IF EXISTS "Users insert own working memory" ON public.agent_working_memory;
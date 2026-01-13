-- Enterprise Grade RLS Hardening - Batch 1
-- Additional AI and Agent tables

-- agent_events - service role only
DROP POLICY IF EXISTS "Authenticated users can manage agent events" ON public.agent_events;
CREATE POLICY "Service role only for agent_events"
ON public.agent_events
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- agent_decision_log - service role only
DROP POLICY IF EXISTS "Authenticated users can manage decision log" ON public.agent_decision_log;
CREATE POLICY "Service role only for agent_decision_log"
ON public.agent_decision_log
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- agent_delegations - service role only
DROP POLICY IF EXISTS "Authenticated users can manage delegations" ON public.agent_delegations;
CREATE POLICY "Service role only for agent_delegations"
ON public.agent_delegations
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- agent_goal_progress - service role only
DROP POLICY IF EXISTS "Authenticated users can manage goal progress" ON public.agent_goal_progress;
CREATE POLICY "Service role only for agent_goal_progress"
ON public.agent_goal_progress
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- agent_goals - service role only
DROP POLICY IF EXISTS "Authenticated users can manage goals" ON public.agent_goals;
CREATE POLICY "Service role only for agent_goals"
ON public.agent_goals
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- agent_action_outcomes - service role only
DROP POLICY IF EXISTS "Authenticated users can manage action outcomes" ON public.agent_action_outcomes;
CREATE POLICY "Service role only for agent_action_outcomes"
ON public.agent_action_outcomes
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- agent_behavior_rules - service role only
DROP POLICY IF EXISTS "Authenticated users can manage behavior rules" ON public.agent_behavior_rules;
CREATE POLICY "Service role only for agent_behavior_rules"
ON public.agent_behavior_rules
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- agent_experiments - service role only
DROP POLICY IF EXISTS "Authenticated users can manage experiments" ON public.agent_experiments;
CREATE POLICY "Service role only for agent_experiments"
ON public.agent_experiments
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- agent_working_memory - service role only
DROP POLICY IF EXISTS "Authenticated users can manage working memory" ON public.agent_working_memory;
CREATE POLICY "Service role only for agent_working_memory"
ON public.agent_working_memory
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- agent_user_preferences - service role only
DROP POLICY IF EXISTS "Authenticated users can manage user preferences" ON public.agent_user_preferences;
CREATE POLICY "Service role only for agent_user_preferences"
ON public.agent_user_preferences
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- agent_autonomy_settings - service role only
DROP POLICY IF EXISTS "Authenticated users can manage autonomy settings" ON public.agent_autonomy_settings;
CREATE POLICY "Service role only for agent_autonomy_settings"
ON public.agent_autonomy_settings
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- agent_registry - service role only
DROP POLICY IF EXISTS "Authenticated users can manage agent registry" ON public.agent_registry;
CREATE POLICY "Service role only for agent_registry"
ON public.agent_registry
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
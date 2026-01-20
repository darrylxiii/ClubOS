-- AGENTIC OS: RLS POLICIES

-- agent_working_memory policies
CREATE POLICY "Users view own working memory" ON agent_working_memory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own working memory" ON agent_working_memory FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own working memory" ON agent_working_memory FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own working memory" ON agent_working_memory FOR DELETE USING (auth.uid() = user_id);

-- agent_user_preferences policies
CREATE POLICY "Users view own preferences" ON agent_user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own preferences" ON agent_user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own preferences" ON agent_user_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own preferences" ON agent_user_preferences FOR DELETE USING (auth.uid() = user_id);

-- agent_registry policies (all authenticated can view)
CREATE POLICY "Authenticated view registry" ON agent_registry FOR SELECT USING (auth.uid() IS NOT NULL);

-- agent_delegations policies
CREATE POLICY "Users view own delegations" ON agent_delegations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert delegations" ON agent_delegations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update delegations" ON agent_delegations FOR UPDATE USING (auth.uid() = user_id);

-- agent_goals policies
CREATE POLICY "Users view own goals" ON agent_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own goals" ON agent_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own goals" ON agent_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own goals" ON agent_goals FOR DELETE USING (auth.uid() = user_id);

-- agent_goal_progress policies
CREATE POLICY "Users view own goal progress" ON agent_goal_progress FOR SELECT 
  USING (EXISTS (SELECT 1 FROM agent_goals WHERE id = goal_id AND user_id = auth.uid()));
CREATE POLICY "Users insert goal progress" ON agent_goal_progress FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM agent_goals WHERE id = goal_id AND user_id = auth.uid()));

-- agent_events policies
CREATE POLICY "Users view own events" ON agent_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert events" ON agent_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update events" ON agent_events FOR UPDATE USING (auth.uid() = user_id);

-- agent_autonomy_settings policies
CREATE POLICY "Users view own autonomy" ON agent_autonomy_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own autonomy" ON agent_autonomy_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own autonomy" ON agent_autonomy_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own autonomy" ON agent_autonomy_settings FOR DELETE USING (auth.uid() = user_id);

-- agent_action_outcomes policies
CREATE POLICY "Users view own outcomes" ON agent_action_outcomes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert outcomes" ON agent_action_outcomes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- agent_behavior_rules policies (all can view)
CREATE POLICY "Authenticated view rules" ON agent_behavior_rules FOR SELECT USING (auth.uid() IS NOT NULL);

-- agent_experiments policies (all can view)
CREATE POLICY "Authenticated view experiments" ON agent_experiments FOR SELECT USING (auth.uid() IS NOT NULL);

-- signal_patterns policies (all can view)
CREATE POLICY "Authenticated view patterns" ON signal_patterns FOR SELECT USING (auth.uid() IS NOT NULL);

-- agent_decision_log policies
CREATE POLICY "Users view own decisions" ON agent_decision_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert decisions" ON agent_decision_log FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Fix RLS policies to be more secure

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Users can manage follow-ups" ON meeting_follow_ups;
DROP POLICY IF EXISTS "Users can manage action items" ON meeting_action_items;
DROP POLICY IF EXISTS "Users can manage roi metrics" ON meeting_roi_metrics;

-- Meeting Follow-ups: host-based access
CREATE POLICY "Hosts can view their follow-ups"
  ON meeting_follow_ups FOR SELECT
  USING (host_id = auth.uid() OR EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist')
  ));

CREATE POLICY "Hosts can create follow-ups"
  ON meeting_follow_ups FOR INSERT
  WITH CHECK (host_id = auth.uid() OR EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist')
  ));

CREATE POLICY "Hosts can update their follow-ups"
  ON meeting_follow_ups FOR UPDATE
  USING (host_id = auth.uid() OR EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist')
  ));

-- Action Items: assignee and host access
CREATE POLICY "Users can view their action items"
  ON meeting_action_items FOR SELECT
  USING (
    assignee_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM meeting_follow_ups mf WHERE mf.id = follow_up_id AND mf.host_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
  );

CREATE POLICY "Hosts can create action items"
  ON meeting_action_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM meeting_follow_ups mf WHERE mf.id = follow_up_id AND mf.host_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist')
  ));

CREATE POLICY "Users can update their action items"
  ON meeting_action_items FOR UPDATE
  USING (
    assignee_id = auth.uid() OR
    EXISTS (SELECT 1 FROM meeting_follow_ups mf WHERE mf.id = follow_up_id AND mf.host_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
  );

-- ROI Metrics: host-based access
CREATE POLICY "Hosts can view their ROI metrics"
  ON meeting_roi_metrics FOR SELECT
  USING (host_id = auth.uid() OR EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist')
  ));

CREATE POLICY "Hosts can insert ROI metrics"
  ON meeting_roi_metrics FOR INSERT
  WITH CHECK (host_id = auth.uid() OR EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist')
  ));

CREATE POLICY "Hosts can update their ROI metrics"
  ON meeting_roi_metrics FOR UPDATE
  USING (host_id = auth.uid() OR EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist')
  ));
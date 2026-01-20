-- Enable RLS on ML tables

ALTER TABLE ml_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_training_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_training_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_feedback ENABLE ROW LEVEL SECURITY;

-- ml_models policies (admin/strategist only)
CREATE POLICY "Admins and strategists can view ML models"
  ON ml_models FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admins can manage ML models"
  ON ml_models FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- ml_predictions policies
CREATE POLICY "Users can view their own predictions"
  ON ml_predictions FOR SELECT
  TO authenticated
  USING (
    candidate_id IN (
      SELECT id FROM candidate_profiles WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "System can insert predictions"
  ON ml_predictions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update prediction outcomes"
  ON ml_predictions FOR UPDATE
  TO authenticated
  USING (true);

-- ml_training_data policies (admin/strategist only)
CREATE POLICY "Admins and strategists can view training data"
  ON ml_training_data FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "System can manage training data"
  ON ml_training_data FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'strategist')
    )
  );

-- ml_training_runs policies (admin/strategist only)
CREATE POLICY "Admins and strategists can view training runs"
  ON ml_training_runs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "System can manage training runs"
  ON ml_training_runs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'strategist')
    )
  );

-- ml_ab_tests policies (admin/strategist only)
CREATE POLICY "Admins and strategists can view A/B tests"
  ON ml_ab_tests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admins can manage A/B tests"
  ON ml_ab_tests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- ml_feedback policies
CREATE POLICY "Users can view their own feedback"
  ON ml_feedback FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own feedback"
  ON ml_feedback FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

COMMENT ON POLICY "Admins and strategists can view ML models" ON ml_models IS 'Only admins and strategists can view trained models';
COMMENT ON POLICY "Users can view their own predictions" ON ml_predictions IS 'Candidates see their predictions, admins/strategists see all';
-- Phase 1: Club AI Analytics Integration Tables
CREATE TABLE IF NOT EXISTS analytics_ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type TEXT NOT NULL CHECK (insight_type IN ('churn_explanation', 'retention_strategy', 'anomaly_analysis', 'trend_forecast')),
  user_segment TEXT,
  insight_content JSONB NOT NULL,
  confidence_score DECIMAL(3,2),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  action_items JSONB
);

CREATE TABLE IF NOT EXISTS admin_analytics_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id),
  query_text TEXT NOT NULL,
  response_text TEXT,
  query_context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 2: Anomaly Detection Tables
CREATE TABLE IF NOT EXISTS detected_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anomaly_type TEXT NOT NULL CHECK (anomaly_type IN ('frustration_spike', 'login_drop', 'application_abandonment', 'performance_issue')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  affected_users INT DEFAULT 0,
  affected_segment TEXT,
  detection_data JSONB NOT NULL,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  alert_sent BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS admin_alert_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id),
  alert_type TEXT NOT NULL,
  min_severity TEXT DEFAULT 'medium',
  notification_channels TEXT[] DEFAULT ARRAY['dashboard'],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 3: Behavior Embeddings Enhancement
ALTER TABLE user_behavior_embeddings 
  ADD COLUMN IF NOT EXISTS feature_vector JSONB,
  ADD COLUMN IF NOT EXISTS cluster_confidence DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS last_clustering_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS segment_description TEXT;

CREATE MATERIALIZED VIEW IF NOT EXISTS user_segments_summary AS
SELECT 
  cluster_id,
  segment_label,
  COUNT(*) as user_count,
  AVG(anomaly_score) as avg_anomaly_score,
  array_agg(user_id) as user_ids
FROM user_behavior_embeddings
WHERE cluster_id IS NOT NULL
GROUP BY cluster_id, segment_label;

-- Phase 4: Scheduled Reports Tables
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  report_type TEXT NOT NULL CHECK (report_type IN ('user_activity', 'candidate_metrics', 'partner_health', 'full_analytics')),
  schedule_cron TEXT NOT NULL,
  timezone TEXT DEFAULT 'Europe/Amsterdam',
  format TEXT[] DEFAULT ARRAY['pdf', 'csv'],
  recipients TEXT[] NOT NULL,
  filters JSONB DEFAULT '{}',
  include_charts BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_sent_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS report_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES scheduled_reports(id) ON DELETE CASCADE,
  execution_time TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  recipients_sent INT DEFAULT 0,
  file_urls JSONB,
  error_message TEXT
);

-- Phase 5: Custom Funnel Builder Tables
CREATE TABLE IF NOT EXISTS custom_funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  is_shared BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS funnel_analytics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID REFERENCES custom_funnels(id) ON DELETE CASCADE,
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  cohort_type TEXT,
  step_metrics JSONB NOT NULL,
  overall_conversion DECIMAL(5,2),
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all new tables
ALTER TABLE analytics_ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_analytics_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE detected_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_alert_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_analytics_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admin-only access
CREATE POLICY "Admins can manage AI insights" ON analytics_ai_insights
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage analytics queries" ON admin_analytics_queries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can view anomalies" ON detected_anomalies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage alert preferences" ON admin_alert_preferences
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage scheduled reports" ON scheduled_reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can view report executions" ON report_executions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage custom funnels" ON custom_funnels
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can view funnel analytics" ON funnel_analytics_cache
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_ai_insights_type ON analytics_ai_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_analytics_ai_insights_generated ON analytics_ai_insights(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_detected_anomalies_severity ON detected_anomalies(severity, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_detected_anomalies_unresolved ON detected_anomalies(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_active ON scheduled_reports(is_active, last_sent_at);
CREATE INDEX IF NOT EXISTS idx_funnel_analytics_cache_lookup ON funnel_analytics_cache(funnel_id, date_range_start, date_range_end);

-- Enable realtime for anomaly alerts
ALTER PUBLICATION supabase_realtime ADD TABLE detected_anomalies;
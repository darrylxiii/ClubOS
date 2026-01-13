-- Enhanced User Activity Analytics Schema (Fixed RLS)

-- 1. User Device Info - Device fingerprinting and context
CREATE TABLE IF NOT EXISTS public.user_device_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_id TEXT NOT NULL,
  device_type TEXT NOT NULL, -- mobile, tablet, desktop
  os TEXT,
  browser TEXT,
  browser_version TEXT,
  screen_resolution TEXT,
  viewport_size TEXT,
  connection_type TEXT, -- 4g, wifi, ethernet, etc.
  language TEXT,
  timezone TEXT,
  user_agent TEXT,
  ip_address INET,
  first_seen_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_device_info_user_id ON public.user_device_info(user_id);
CREATE INDEX idx_user_device_info_session_id ON public.user_device_info(session_id);
CREATE INDEX idx_user_device_info_device_type ON public.user_device_info(device_type);

-- 2. User Feature Usage - Feature-level tracking
CREATE TABLE IF NOT EXISTS public.user_feature_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_id TEXT,
  feature_name TEXT NOT NULL,
  feature_category TEXT NOT NULL, -- navigation, profile, application, search, etc.
  action_type TEXT NOT NULL, -- click, view, complete, abandon
  duration_ms INTEGER,
  completed BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_feature_usage_user_id ON public.user_feature_usage(user_id);
CREATE INDEX idx_user_feature_usage_feature_name ON public.user_feature_usage(feature_name);
CREATE INDEX idx_user_feature_usage_created_at ON public.user_feature_usage(created_at);

-- 3. User Performance Metrics - Web Vitals and performance
CREATE TABLE IF NOT EXISTS public.user_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_id TEXT NOT NULL,
  page_path TEXT NOT NULL,
  ttfb_ms INTEGER, -- Time to First Byte
  fcp_ms INTEGER, -- First Contentful Paint
  lcp_ms INTEGER, -- Largest Contentful Paint
  fid_ms INTEGER, -- First Input Delay
  cls DECIMAL(10, 4), -- Cumulative Layout Shift
  api_response_times JSONB DEFAULT '{}'::jsonb,
  network_info JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_performance_user_id ON public.user_performance_metrics(user_id);
CREATE INDEX idx_user_performance_page_path ON public.user_performance_metrics(page_path);
CREATE INDEX idx_user_performance_created_at ON public.user_performance_metrics(created_at);

-- 4. User Behavior Embeddings - AI/ML ready data
CREATE TABLE IF NOT EXISTS public.user_behavior_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  behavior_vector JSONB NOT NULL, -- Encoded behavior patterns
  cluster_id INTEGER,
  anomaly_score DECIMAL(5, 4),
  segment_label TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_user_behavior_embeddings_user_id ON public.user_behavior_embeddings(user_id);
CREATE INDEX idx_user_behavior_embeddings_cluster_id ON public.user_behavior_embeddings(cluster_id);
CREATE INDEX idx_user_behavior_embeddings_date ON public.user_behavior_embeddings(date);

-- 5. Candidate Activity Metrics - Candidate-specific tracking
CREATE TABLE IF NOT EXISTS public.candidate_activity_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  jobs_viewed INTEGER DEFAULT 0,
  jobs_saved INTEGER DEFAULT 0,
  applications_started INTEGER DEFAULT 0,
  applications_completed INTEGER DEFAULT 0,
  applications_submitted INTEGER DEFAULT 0,
  resume_views INTEGER DEFAULT 0,
  resume_updates INTEGER DEFAULT 0,
  profile_updates INTEGER DEFAULT 0,
  profile_completeness DECIMAL(5, 2),
  interview_prep_time_minutes INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  search_queries INTEGER DEFAULT 0,
  total_session_time_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_candidate_activity_user_id ON public.candidate_activity_metrics(user_id);
CREATE INDEX idx_candidate_activity_date ON public.candidate_activity_metrics(date);

-- 6. Admin Audit Activity - Admin action tracking
CREATE TABLE IF NOT EXISTS public.admin_audit_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  action_type TEXT NOT NULL, -- approve, reject, delete, update, create, configure
  action_category TEXT NOT NULL, -- user_management, content_moderation, system_config
  target_entity TEXT NOT NULL, -- user, job, application, etc.
  target_id UUID,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  impact_score INTEGER, -- 1-10, how critical was this action
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_admin_audit_admin_id ON public.admin_audit_activity(admin_id);
CREATE INDEX idx_admin_audit_action_type ON public.admin_audit_activity(action_type);
CREATE INDEX idx_admin_audit_target_entity ON public.admin_audit_activity(target_entity);
CREATE INDEX idx_admin_audit_created_at ON public.admin_audit_activity(created_at);

-- Enable RLS on all new tables
ALTER TABLE public.user_device_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feature_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_behavior_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_activity_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can read their own data
CREATE POLICY "Users can view own device info" ON public.user_device_info
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own feature usage" ON public.user_feature_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own performance metrics" ON public.user_performance_metrics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own behavior embeddings" ON public.user_behavior_embeddings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own candidate metrics" ON public.candidate_activity_metrics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own admin audit" ON public.admin_audit_activity
  FOR SELECT USING (auth.uid() = admin_id);

-- Service role policies for inserting/updating tracking data
CREATE POLICY "Service role can manage device info" ON public.user_device_info
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage feature usage" ON public.user_feature_usage
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage performance metrics" ON public.user_performance_metrics
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage behavior embeddings" ON public.user_behavior_embeddings
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage candidate metrics" ON public.candidate_activity_metrics
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage admin audit" ON public.admin_audit_activity
  FOR ALL USING (true) WITH CHECK (true);

-- Materialized views for fast analytics queries
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_daily_user_segments AS
SELECT 
  DATE(created_at) as date,
  device_type,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT session_id) as sessions
FROM public.user_device_info
GROUP BY DATE(created_at), device_type;

CREATE UNIQUE INDEX ON public.mv_daily_user_segments(date, device_type);

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_feature_usage_summary AS
SELECT 
  feature_category,
  feature_name,
  COUNT(*) as total_uses,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(duration_ms) as avg_duration_ms,
  SUM(CASE WHEN completed THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(*), 0) as completion_rate
FROM public.user_feature_usage
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY feature_category, feature_name;

CREATE UNIQUE INDEX ON public.mv_feature_usage_summary(feature_category, feature_name);

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_daily_user_segments;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_feature_usage_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
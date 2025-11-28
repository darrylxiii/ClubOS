-- ==========================================
-- COMPREHENSIVE USER ACTIVITY TRACKING SYSTEM
-- FBI-Level Tracking Infrastructure
-- ==========================================

-- 1. User Session Events (Granular tracking)
CREATE TABLE IF NOT EXISTS public.user_session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'scroll', 'click', 'hover', 'focus', 'blur', 
    'form_interaction', 'navigation', 'error', 'mouse_idle',
    'rage_click', 'dead_click', 'exit_intent'
  )),
  element_id TEXT,
  element_class TEXT,
  element_tag TEXT,
  element_text TEXT,
  page_path TEXT NOT NULL,
  viewport_width INTEGER,
  viewport_height INTEGER,
  scroll_depth_percent INTEGER,
  scroll_direction TEXT,
  x_coordinate INTEGER,
  y_coordinate INTEGER,
  time_on_element_ms INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_session_events_user_session ON public.user_session_events(user_id, session_id);
CREATE INDEX idx_session_events_timestamp ON public.user_session_events(event_timestamp DESC);
CREATE INDEX idx_session_events_type ON public.user_session_events(event_type);
CREATE INDEX idx_session_events_page ON public.user_session_events(page_path);

-- 2. User Page Analytics (Per-page metrics)
CREATE TABLE IF NOT EXISTS public.user_page_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  page_path TEXT NOT NULL,
  entry_timestamp TIMESTAMPTZ NOT NULL,
  exit_timestamp TIMESTAMPTZ,
  time_on_page_seconds INTEGER,
  scroll_depth_max INTEGER DEFAULT 0,
  scroll_depth_avg INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  unique_elements_clicked INTEGER DEFAULT 0,
  total_scrolls INTEGER DEFAULT 0,
  scroll_velocity_avg NUMERIC(10,2),
  mouse_distance_pixels INTEGER DEFAULT 0,
  mouse_idle_time_seconds INTEGER DEFAULT 0,
  form_fields_interacted INTEGER DEFAULT 0,
  form_fields_abandoned INTEGER DEFAULT 0,
  exit_type TEXT CHECK (exit_type IN (
    'navigation', 'tab_close', 'back_button', 'link_click', 'idle_timeout'
  )),
  bounce BOOLEAN DEFAULT false,
  engaged BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_page_analytics_user_session ON public.user_page_analytics(user_id, session_id);
CREATE INDEX idx_page_analytics_page ON public.user_page_analytics(page_path);
CREATE INDEX idx_page_analytics_entry ON public.user_page_analytics(entry_timestamp DESC);

-- 3. User Journey Tracking (Flow/funnel analysis)
CREATE TABLE IF NOT EXISTS public.user_journey_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  journey_id UUID NOT NULL,
  step_number INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  from_page TEXT,
  to_page TEXT,
  action_taken TEXT,
  action_target TEXT,
  time_to_action_ms INTEGER,
  conversion_event BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_journey_user_session ON public.user_journey_tracking(user_id, session_id);
CREATE INDEX idx_journey_id ON public.user_journey_tracking(journey_id);
CREATE INDEX idx_journey_created ON public.user_journey_tracking(created_at DESC);

-- 4. User Search Analytics (Search behavior)
CREATE TABLE IF NOT EXISTS public.user_search_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  search_query TEXT NOT NULL,
  search_filters JSONB DEFAULT '{}'::jsonb,
  results_count INTEGER DEFAULT 0,
  clicked_result_position INTEGER,
  time_to_first_click_ms INTEGER,
  search_category TEXT CHECK (search_category IN (
    'jobs', 'candidates', 'companies', 'global', 'knowledge'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_search_analytics_user ON public.user_search_analytics(user_id);
CREATE INDEX idx_search_analytics_query ON public.user_search_analytics(search_query);
CREATE INDEX idx_search_analytics_created ON public.user_search_analytics(created_at DESC);

-- 5. User Frustration Signals (UX issues)
CREATE TABLE IF NOT EXISTS public.user_frustration_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  page_path TEXT NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN (
    'rage_click', 'dead_click', 'error_encountered', 
    'slow_network', 'form_error', 'repeated_action'
  )),
  element_info JSONB DEFAULT '{}'::jsonb,
  count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_frustration_user_session ON public.user_frustration_signals(user_id, session_id);
CREATE INDEX idx_frustration_type ON public.user_frustration_signals(signal_type);
CREATE INDEX idx_frustration_created ON public.user_frustration_signals(created_at DESC);

-- 6. Partner Engagement Metrics (Partner activity)
CREATE TABLE IF NOT EXISTS public.partner_engagement_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_logins INTEGER DEFAULT 0,
  total_session_time_minutes INTEGER DEFAULT 0,
  candidates_viewed INTEGER DEFAULT 0,
  candidates_shortlisted INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  meetings_scheduled INTEGER DEFAULT 0,
  pipeline_updates INTEGER DEFAULT 0,
  offers_created INTEGER DEFAULT 0,
  average_response_time_hours NUMERIC(10,2),
  engagement_score NUMERIC(5,2) DEFAULT 0,
  activity_trend TEXT CHECK (activity_trend IN (
    'increasing', 'stable', 'declining', 'churning'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(partner_id, date)
);

CREATE INDEX idx_partner_metrics_partner ON public.partner_engagement_metrics(partner_id);
CREATE INDEX idx_partner_metrics_date ON public.partner_engagement_metrics(date DESC);
CREATE INDEX idx_partner_metrics_trend ON public.partner_engagement_metrics(activity_trend);

-- ==========================================
-- DATABASE FUNCTIONS
-- ==========================================

-- Function: Calculate User Engagement Score
CREATE OR REPLACE FUNCTION public.calculate_user_engagement_score(
  p_user_id UUID,
  p_days INTEGER DEFAULT 7
)
RETURNS NUMERIC AS $$
DECLARE
  v_score NUMERIC := 0;
  v_sessions INTEGER;
  v_avg_time NUMERIC;
  v_interactions INTEGER;
  v_engaged_pages INTEGER;
BEGIN
  -- Session frequency (0-30 points)
  SELECT COUNT(DISTINCT session_id) INTO v_sessions
  FROM user_page_analytics
  WHERE user_id = p_user_id
    AND entry_timestamp > NOW() - (p_days || ' days')::INTERVAL;
  v_score := v_score + LEAST(v_sessions * 2, 30);

  -- Average time per session (0-25 points)
  SELECT AVG(time_on_page_seconds) INTO v_avg_time
  FROM user_page_analytics
  WHERE user_id = p_user_id
    AND entry_timestamp > NOW() - (p_days || ' days')::INTERVAL;
  v_score := v_score + LEAST(COALESCE(v_avg_time, 0) / 10, 25);

  -- Interaction count (0-25 points)
  SELECT COUNT(*) INTO v_interactions
  FROM user_session_events
  WHERE user_id = p_user_id
    AND event_timestamp > NOW() - (p_days || ' days')::INTERVAL
    AND event_type IN ('click', 'form_interaction', 'navigation');
  v_score := v_score + LEAST(v_interactions / 10, 25);

  -- Engaged pages (0-20 points)
  SELECT COUNT(*) INTO v_engaged_pages
  FROM user_page_analytics
  WHERE user_id = p_user_id
    AND entry_timestamp > NOW() - (p_days || ' days')::INTERVAL
    AND engaged = true;
  v_score := v_score + LEAST(v_engaged_pages * 2, 20);

  RETURN LEAST(v_score, 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Detect Churn Risk
CREATE OR REPLACE FUNCTION public.detect_churn_risk(
  p_user_id UUID
)
RETURNS TEXT AS $$
DECLARE
  v_last_activity TIMESTAMPTZ;
  v_recent_engagement NUMERIC;
  v_frustration_count INTEGER;
BEGIN
  -- Get last activity
  SELECT MAX(last_activity_at) INTO v_last_activity
  FROM user_activity_tracking
  WHERE user_id = p_user_id;

  -- No activity = high risk
  IF v_last_activity IS NULL OR v_last_activity < NOW() - INTERVAL '30 days' THEN
    RETURN 'high';
  END IF;

  -- Calculate recent engagement
  v_recent_engagement := calculate_user_engagement_score(p_user_id, 7);

  -- Check frustration signals
  SELECT COUNT(*) INTO v_frustration_count
  FROM user_frustration_signals
  WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '7 days';

  -- Risk logic
  IF v_last_activity < NOW() - INTERVAL '14 days' 
     OR v_recent_engagement < 20 
     OR v_frustration_count > 10 THEN
    RETURN 'high';
  ELSIF v_last_activity < NOW() - INTERVAL '7 days' 
        OR v_recent_engagement < 40 
        OR v_frustration_count > 5 THEN
    RETURN 'medium';
  ELSE
    RETURN 'low';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Calculate Partner Health Score
CREATE OR REPLACE FUNCTION public.calculate_partner_health_score(
  p_partner_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_metrics RECORD;
  v_health_score NUMERIC := 0;
BEGIN
  -- Get last 30 days metrics
  SELECT 
    SUM(total_logins) as logins,
    SUM(total_session_time_minutes) as session_time,
    SUM(candidates_viewed) as candidates_viewed,
    SUM(messages_sent) as messages_sent,
    SUM(pipeline_updates) as pipeline_updates,
    AVG(average_response_time_hours) as avg_response_time
  INTO v_metrics
  FROM partner_engagement_metrics
  WHERE partner_id = p_partner_id
    AND date > CURRENT_DATE - INTERVAL '30 days';

  -- Calculate score (0-100)
  v_health_score := 0;
  
  -- Login frequency (0-25)
  v_health_score := v_health_score + LEAST(COALESCE(v_metrics.logins, 0) * 2, 25);
  
  -- Candidate engagement (0-25)
  v_health_score := v_health_score + LEAST(COALESCE(v_metrics.candidates_viewed, 0) / 2, 25);
  
  -- Communication (0-25)
  v_health_score := v_health_score + LEAST(COALESCE(v_metrics.messages_sent, 0), 25);
  
  -- Pipeline activity (0-25)
  v_health_score := v_health_score + LEAST(COALESCE(v_metrics.pipeline_updates, 0), 25);

  v_result := jsonb_build_object(
    'health_score', LEAST(v_health_score, 100),
    'total_logins', COALESCE(v_metrics.logins, 0),
    'session_time_minutes', COALESCE(v_metrics.session_time, 0),
    'candidates_viewed', COALESCE(v_metrics.candidates_viewed, 0),
    'messages_sent', COALESCE(v_metrics.messages_sent, 0),
    'pipeline_updates', COALESCE(v_metrics.pipeline_updates, 0),
    'avg_response_time_hours', COALESCE(v_metrics.avg_response_time, 0),
    'status', CASE 
      WHEN v_health_score >= 70 THEN 'healthy'
      WHEN v_health_score >= 40 THEN 'moderate'
      ELSE 'at_risk'
    END
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE public.user_session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_page_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_journey_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_search_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_frustration_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_engagement_metrics ENABLE ROW LEVEL SECURITY;

-- Users can insert their own tracking data
CREATE POLICY "Users can insert own session events" ON public.user_session_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own page analytics" ON public.user_page_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own journey tracking" ON public.user_journey_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own search analytics" ON public.user_search_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own frustration signals" ON public.user_frustration_signals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all tracking data
CREATE POLICY "Admins can view all session events" ON public.user_session_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view all page analytics" ON public.user_page_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view all journey tracking" ON public.user_journey_tracking
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view all search analytics" ON public.user_search_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view all frustration signals" ON public.user_frustration_signals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view partner metrics" ON public.partner_engagement_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "System can manage partner metrics" ON public.partner_engagement_metrics
  FOR ALL USING (true);
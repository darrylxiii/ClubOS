-- Phase 5: Analytics & Insights Database Schema (Fixed RLS)

-- 1. Conversation Analytics Daily Aggregates
CREATE TABLE IF NOT EXISTS public.conversation_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  total_messages INTEGER DEFAULT 0,
  avg_response_time_minutes NUMERIC(10, 2),
  unique_conversations INTEGER DEFAULT 0,
  ai_assisted_count INTEGER DEFAULT 0,
  sentiment_positive INTEGER DEFAULT 0,
  sentiment_neutral INTEGER DEFAULT 0,
  sentiment_negative INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Security Events Table
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_id UUID REFERENCES auth.users(id),
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. User Engagement Daily Aggregates
CREATE TABLE IF NOT EXISTS public.user_engagement_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  user_id UUID NOT NULL,
  page_views INTEGER DEFAULT 0,
  feature_usage JSONB DEFAULT '{}',
  session_count INTEGER DEFAULT 0,
  total_time_seconds INTEGER DEFAULT 0,
  actions_performed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(date, user_id)
);

-- 4. Career Insights Cache Table
CREATE TABLE IF NOT EXISTS public.career_insights_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),
  skill_gap_analysis JSONB DEFAULT '{}',
  market_position JSONB DEFAULT '{}',
  career_trends JSONB DEFAULT '{}',
  next_actions JSONB DEFAULT '[]',
  generated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversation_analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_engagement_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_insights_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies using user_roles table for admin checks
CREATE POLICY "Admins can view conversation analytics"
  ON public.conversation_analytics_daily FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for security_events
CREATE POLICY "Admins can view security events"
  ON public.security_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage security events"
  ON public.security_events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert security events"
  ON public.security_events FOR INSERT
  WITH CHECK (true);

-- RLS Policies for user_engagement_daily
CREATE POLICY "Admins can view all engagement"
  ON public.user_engagement_daily FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view own engagement"
  ON public.user_engagement_daily FOR SELECT
  USING (user_id = auth.uid());

-- RLS Policies for career_insights_cache
CREATE POLICY "Users can view own career insights"
  ON public.career_insights_cache FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own career insights"
  ON public.career_insights_cache FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own career insights"
  ON public.career_insights_cache FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_analytics_date ON public.conversation_analytics_daily(date DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON public.security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON public.security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON public.security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_engagement_daily_date ON public.user_engagement_daily(date DESC);
CREATE INDEX IF NOT EXISTS idx_user_engagement_daily_user ON public.user_engagement_daily(user_id);
CREATE INDEX IF NOT EXISTS idx_career_insights_user ON public.career_insights_cache(user_id);

-- Enable realtime for security events (for live monitoring)
ALTER PUBLICATION supabase_realtime ADD TABLE public.security_events;
-- =====================================================
-- Phase 1: Partner Analytics Infrastructure
-- =====================================================

-- 1. Create partner_smart_alerts table
CREATE TABLE IF NOT EXISTS public.partner_smart_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info', 'success')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_required TEXT,
  action_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_partner_smart_alerts_company_id ON public.partner_smart_alerts(company_id);
CREATE INDEX idx_partner_smart_alerts_created_at ON public.partner_smart_alerts(created_at DESC);
CREATE INDEX idx_partner_smart_alerts_severity ON public.partner_smart_alerts(severity) WHERE is_dismissed = false;

-- RLS for partner_smart_alerts
ALTER TABLE public.partner_smart_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view their company alerts"
  ON public.partner_smart_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.company_id = partner_smart_alerts.company_id
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'strategist'::public.app_role)
  );

CREATE POLICY "Partners can dismiss their alerts"
  ON public.partner_smart_alerts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.company_id = partner_smart_alerts.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.company_id = partner_smart_alerts.company_id
    )
  );

-- 2. Create partner_ai_insights table
CREATE TABLE IF NOT EXISTS public.partner_ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  impact_level TEXT CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),
  data_points JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  generated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_partner_ai_insights_company_id ON public.partner_ai_insights(company_id);
CREATE INDEX idx_partner_ai_insights_generated_at ON public.partner_ai_insights(generated_at DESC);
CREATE INDEX idx_partner_ai_insights_unread ON public.partner_ai_insights(company_id) WHERE is_read = false;

-- RLS for partner_ai_insights
ALTER TABLE public.partner_ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view their company insights"
  ON public.partner_ai_insights FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.company_id = partner_ai_insights.company_id
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'strategist'::public.app_role)
  );

CREATE POLICY "Partners can mark insights as read"
  ON public.partner_ai_insights FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.company_id = partner_ai_insights.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.company_id = partner_ai_insights.company_id
    )
  );

-- 3. Create partner_health_scores table
CREATE TABLE IF NOT EXISTS public.partner_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  response_time_score INTEGER CHECK (response_time_score >= 0 AND response_time_score <= 100),
  pipeline_velocity_score INTEGER CHECK (pipeline_velocity_score >= 0 AND pipeline_velocity_score <= 100),
  conversion_rate_score INTEGER CHECK (conversion_rate_score >= 0 AND conversion_rate_score <= 100),
  bottleneck_score INTEGER CHECK (bottleneck_score >= 0 AND bottleneck_score <= 100),
  metadata JSONB DEFAULT '{}'::jsonb,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_partner_health_scores_company_id ON public.partner_health_scores(company_id);
CREATE INDEX idx_partner_health_scores_calculated_at ON public.partner_health_scores(calculated_at DESC);

-- RLS for partner_health_scores
ALTER TABLE public.partner_health_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view their company health scores"
  ON public.partner_health_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.company_id = partner_health_scores.company_id
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'strategist'::public.app_role)
  );

-- 4. Create partner_benchmarks table
CREATE TABLE IF NOT EXISTS public.partner_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  company_value NUMERIC,
  industry_average NUMERIC,
  industry_percentile INTEGER CHECK (industry_percentile >= 0 AND industry_percentile <= 100),
  period_start DATE,
  period_end DATE,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_partner_benchmarks_company_id ON public.partner_benchmarks(company_id);
CREATE INDEX idx_partner_benchmarks_metric_type ON public.partner_benchmarks(metric_type);
CREATE INDEX idx_partner_benchmarks_calculated_at ON public.partner_benchmarks(calculated_at DESC);

-- RLS for partner_benchmarks
ALTER TABLE public.partner_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view their company benchmarks"
  ON public.partner_benchmarks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.company_id = partner_benchmarks.company_id
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'strategist'::public.app_role)
  );

-- 5. Create hiring_metrics_weekly table
CREATE TABLE IF NOT EXISTS public.hiring_metrics_weekly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  total_applications INTEGER DEFAULT 0,
  total_interviews INTEGER DEFAULT 0,
  total_offers INTEGER DEFAULT 0,
  hires INTEGER DEFAULT 0,
  avg_days_to_hire NUMERIC,
  avg_days_to_interview NUMERIC,
  conversion_rate_application_to_interview NUMERIC,
  conversion_rate_interview_to_offer NUMERIC,
  conversion_rate_offer_to_hire NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, week_start)
);

CREATE INDEX idx_hiring_metrics_weekly_company_id ON public.hiring_metrics_weekly(company_id);
CREATE INDEX idx_hiring_metrics_weekly_week_start ON public.hiring_metrics_weekly(week_start DESC);

-- RLS for hiring_metrics_weekly
ALTER TABLE public.hiring_metrics_weekly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view their company hiring metrics"
  ON public.hiring_metrics_weekly FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.company_id = hiring_metrics_weekly.company_id
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'strategist'::public.app_role)
  );

-- =====================================================
-- Functions
-- =====================================================

-- Function: generate_smart_alerts
CREATE OR REPLACE FUNCTION public.generate_smart_alerts(p_company_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stale_count INTEGER;
  v_overdue_interviews INTEGER;
  v_draft_jobs INTEGER;
BEGIN
  -- Check for stale applications (>48h without update)
  SELECT COUNT(*) INTO v_stale_count
  FROM public.applications
  WHERE company_name = (SELECT name FROM public.companies WHERE id = p_company_id)
  AND status = 'active'
  AND updated_at < NOW() - INTERVAL '48 hours';
  
  IF v_stale_count > 0 THEN
    INSERT INTO public.partner_smart_alerts (company_id, alert_type, severity, title, message, action_required)
    VALUES (
      p_company_id,
      'stale_applications',
      'warning',
      'Stale Applications Detected',
      format('%s applications have not been updated in over 48 hours', v_stale_count),
      'Review and update application statuses'
    );
  END IF;
  
  -- Check for draft jobs
  SELECT COUNT(*) INTO v_draft_jobs
  FROM public.jobs
  WHERE company_id = p_company_id
  AND status = 'draft';
  
  IF v_draft_jobs > 0 THEN
    INSERT INTO public.partner_smart_alerts (company_id, alert_type, severity, title, message, action_required)
    VALUES (
      p_company_id,
      'draft_jobs',
      'info',
      'Unpublished Job Postings',
      format('You have %s draft job postings ready to publish', v_draft_jobs),
      'Review and publish jobs to receive candidates'
    );
  END IF;
END;
$$;

-- Function: calculate_company_health_score
CREATE OR REPLACE FUNCTION public.calculate_company_health_score(
  p_company_id UUID,
  p_period_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  overall_score INTEGER,
  response_time_score INTEGER,
  pipeline_velocity_score INTEGER,
  conversion_rate_score INTEGER,
  bottleneck_score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg_response_hours NUMERIC;
  v_avg_days_to_hire NUMERIC;
  v_conversion_rate NUMERIC;
  v_response_score INTEGER;
  v_velocity_score INTEGER;
  v_conversion_score INTEGER;
  v_bottleneck_score INTEGER;
  v_overall_score INTEGER;
BEGIN
  -- Calculate average response time (lower is better, target: < 24h = 100 points)
  SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600) INTO v_avg_response_hours
  FROM public.applications
  WHERE company_name = (SELECT name FROM public.companies WHERE id = p_company_id)
  AND created_at > NOW() - (p_period_days || ' days')::INTERVAL;
  
  v_response_score := CASE
    WHEN v_avg_response_hours IS NULL THEN 50
    WHEN v_avg_response_hours <= 24 THEN 100
    WHEN v_avg_response_hours <= 48 THEN 80
    WHEN v_avg_response_hours <= 72 THEN 60
    ELSE 40
  END;
  
  -- Calculate pipeline velocity (target: < 30 days = 100 points)
  SELECT AVG(EXTRACT(EPOCH FROM (updated_at - applied_at)) / 86400) INTO v_avg_days_to_hire
  FROM public.applications
  WHERE company_name = (SELECT name FROM public.companies WHERE id = p_company_id)
  AND status = 'hired'
  AND applied_at > NOW() - (p_period_days || ' days')::INTERVAL;
  
  v_velocity_score := CASE
    WHEN v_avg_days_to_hire IS NULL THEN 50
    WHEN v_avg_days_to_hire <= 30 THEN 100
    WHEN v_avg_days_to_hire <= 45 THEN 80
    WHEN v_avg_days_to_hire <= 60 THEN 60
    ELSE 40
  END;
  
  -- Calculate conversion rate (target: > 10% = 100 points)
  SELECT 
    CASE 
      WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE status = 'hired')::NUMERIC / COUNT(*)::NUMERIC) * 100
      ELSE 0
    END INTO v_conversion_rate
  FROM public.applications
  WHERE company_name = (SELECT name FROM public.companies WHERE id = p_company_id)
  AND applied_at > NOW() - (p_period_days || ' days')::INTERVAL;
  
  v_conversion_score := CASE
    WHEN v_conversion_rate >= 10 THEN 100
    WHEN v_conversion_rate >= 7 THEN 80
    WHEN v_conversion_rate >= 5 THEN 60
    WHEN v_conversion_rate >= 3 THEN 40
    ELSE 20
  END;
  
  -- Bottleneck score (inverse of stale applications)
  v_bottleneck_score := 80; -- Default, will be calculated based on stale apps
  
  -- Calculate overall score
  v_overall_score := (v_response_score + v_velocity_score + v_conversion_score + v_bottleneck_score) / 4;
  
  -- Insert into health scores table
  INSERT INTO public.partner_health_scores (
    company_id,
    overall_score,
    response_time_score,
    pipeline_velocity_score,
    conversion_rate_score,
    bottleneck_score,
    metadata
  ) VALUES (
    p_company_id,
    v_overall_score,
    v_response_score,
    v_velocity_score,
    v_conversion_score,
    v_bottleneck_score,
    jsonb_build_object(
      'avg_response_hours', v_avg_response_hours,
      'avg_days_to_hire', v_avg_days_to_hire,
      'conversion_rate', v_conversion_rate,
      'period_days', p_period_days
    )
  );
  
  RETURN QUERY SELECT v_overall_score, v_response_score, v_velocity_score, v_conversion_score, v_bottleneck_score;
END;
$$;

-- =====================================================
-- Fix Security Warnings on Existing Functions
-- =====================================================

-- Fix has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$;

-- Fix get_user_role function
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role public.app_role;
BEGIN
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY assigned_at DESC
  LIMIT 1;
  
  RETURN user_role;
END;
$$;

-- Fix update_dm_conversation_timestamp
CREATE OR REPLACE FUNCTION public.update_dm_conversation_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.dm_conversations
  SET last_message_at = NOW(), updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

-- Fix update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Enable realtime for partner tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_smart_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_ai_insights;
ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_health_scores;
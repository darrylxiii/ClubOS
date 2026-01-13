-- =============================================
-- Revenue Analytics & Tracking
-- =============================================

-- Revenue metrics aggregated daily
CREATE TABLE IF NOT EXISTS public.revenue_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL UNIQUE,
  mrr INTEGER NOT NULL DEFAULT 0, -- Monthly Recurring Revenue in cents
  arr INTEGER NOT NULL DEFAULT 0, -- Annual Recurring Revenue in cents
  new_mrr INTEGER DEFAULT 0, -- New MRR from new subscriptions
  expansion_mrr INTEGER DEFAULT 0, -- MRR from upgrades
  contraction_mrr INTEGER DEFAULT 0, -- MRR lost from downgrades
  churn_mrr INTEGER DEFAULT 0, -- MRR lost from cancellations
  active_subscriptions INTEGER DEFAULT 0,
  new_subscriptions INTEGER DEFAULT 0,
  canceled_subscriptions INTEGER DEFAULT 0,
  trialing_subscriptions INTEGER DEFAULT 0,
  average_revenue_per_user INTEGER DEFAULT 0, -- ARPU in cents
  customer_lifetime_value INTEGER DEFAULT 0, -- LTV estimate in cents
  churn_rate DECIMAL(5,2) DEFAULT 0, -- Percentage
  net_revenue_retention DECIMAL(5,2) DEFAULT 100, -- Percentage
  total_revenue INTEGER DEFAULT 0, -- Total revenue collected (including one-time)
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enhanced referral program
CREATE TABLE IF NOT EXISTS public.referral_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_type TEXT NOT NULL CHECK (referral_type IN ('candidate', 'company', 'partner')),
  bonus_type TEXT NOT NULL CHECK (bonus_type IN ('standard', 'company_premium', 'executive')),
  bonus_amount_euros INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'qualified', 'paid', 'rejected')),
  qualified_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  payment_reference TEXT,
  requirements_met JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(referrer_id, referred_id)
);

-- Referral program configuration
CREATE TABLE IF NOT EXISTS public.referral_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_type TEXT NOT NULL UNIQUE,
  bonus_amount_euros INTEGER NOT NULL,
  requirements JSONB NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Subscription tier limits and usage
CREATE TABLE IF NOT EXISTS public.subscription_tier_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  limit_type TEXT NOT NULL, -- 'job_posts', 'applications', 'matches', 'api_calls', 'team_members'
  limit_value INTEGER NOT NULL, -- -1 for unlimited
  period TEXT NOT NULL DEFAULT 'month' CHECK (period IN ('day', 'week', 'month', 'year')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(plan_id, limit_type)
);

-- Customer acquisition tracking
CREATE TABLE IF NOT EXISTS public.customer_acquisition (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  acquisition_channel TEXT NOT NULL, -- 'referral', 'organic', 'paid', 'partnership', 'outbound'
  acquisition_source TEXT, -- More specific source (e.g., 'linkedin', 'google_ads', 'partner_xyz')
  first_touchpoint_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  converted_to_paid_at TIMESTAMPTZ,
  acquisition_cost_euros INTEGER, -- CAC in euros
  referral_bonus_id UUID REFERENCES public.referral_bonuses(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Churn tracking and analysis
CREATE TABLE IF NOT EXISTS public.churn_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  churned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  plan_tier TEXT NOT NULL,
  subscription_duration_days INTEGER NOT NULL,
  total_revenue_euros INTEGER NOT NULL,
  churn_reason TEXT,
  churn_feedback TEXT,
  retention_attempt BOOLEAN DEFAULT false,
  retention_offer TEXT,
  reactivation_likelihood DECIMAL(3,2), -- 0-1 score
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- Indexes
-- =============================================

CREATE INDEX IF NOT EXISTS idx_revenue_metrics_date ON public.revenue_metrics(metric_date DESC);

CREATE INDEX IF NOT EXISTS idx_referral_bonuses_referrer ON public.referral_bonuses(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_status ON public.referral_bonuses(status);
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_type ON public.referral_bonuses(referral_type);

CREATE INDEX IF NOT EXISTS idx_customer_acquisition_user ON public.customer_acquisition(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_acquisition_channel ON public.customer_acquisition(acquisition_channel);

CREATE INDEX IF NOT EXISTS idx_churn_analysis_subscription ON public.churn_analysis(subscription_id);
CREATE INDEX IF NOT EXISTS idx_churn_analysis_churned_at ON public.churn_analysis(churned_at);

-- =============================================
-- RLS Policies
-- =============================================

ALTER TABLE public.revenue_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_tier_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_acquisition ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.churn_analysis ENABLE ROW LEVEL SECURITY;

-- Only admins can view revenue metrics
CREATE POLICY "Admins can view revenue metrics"
  ON public.revenue_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Users can view their own referral bonuses
CREATE POLICY "Users can view their own referral bonuses"
  ON public.referral_bonuses FOR SELECT
  USING (referrer_id = auth.uid() OR referred_id = auth.uid());

-- Users can create referral bonuses
CREATE POLICY "Users can create referral bonuses"
  ON public.referral_bonuses FOR INSERT
  WITH CHECK (referrer_id = auth.uid());

-- Everyone can view active referral config
CREATE POLICY "Anyone can view referral config"
  ON public.referral_config FOR SELECT
  USING (is_active = true);

-- Everyone can view subscription tier limits
CREATE POLICY "Anyone can view tier limits"
  ON public.subscription_tier_limits FOR SELECT
  USING (true);

-- Users can view their own acquisition data
CREATE POLICY "Users can view their own acquisition data"
  ON public.customer_acquisition FOR SELECT
  USING (user_id = auth.uid());

-- Admins can view all acquisition data
CREATE POLICY "Admins can view all acquisition data"
  ON public.customer_acquisition FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- Functions
-- =============================================

-- Calculate MRR from active subscriptions
CREATE OR REPLACE FUNCTION public.calculate_current_mrr()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_mrr INTEGER := 0;
BEGIN
  SELECT COALESCE(SUM(sp.price_euros * 100), 0) INTO total_mrr
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON s.plan_id = sp.id
  WHERE s.status = 'active'
    AND s.current_period_end > now();
  
  RETURN total_mrr;
END;
$$;

-- Calculate churn rate
CREATE OR REPLACE FUNCTION public.calculate_churn_rate(start_date DATE, end_date DATE)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  beginning_subscriptions INTEGER;
  churned_subscriptions INTEGER;
  churn_rate DECIMAL;
BEGIN
  -- Count active subscriptions at start
  SELECT COUNT(*) INTO beginning_subscriptions
  FROM public.subscriptions
  WHERE status = 'active'
    AND created_at < start_date;
  
  -- Count subscriptions that churned during period
  SELECT COUNT(*) INTO churned_subscriptions
  FROM public.churn_analysis
  WHERE churned_at >= start_date
    AND churned_at < end_date;
  
  IF beginning_subscriptions = 0 THEN
    RETURN 0;
  END IF;
  
  churn_rate := (churned_subscriptions::DECIMAL / beginning_subscriptions::DECIMAL) * 100;
  
  RETURN churn_rate;
END;
$$;

-- Check if user has reached tier limit
CREATE OR REPLACE FUNCTION public.check_tier_limit(
  check_user_id UUID,
  limit_type_param TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_subscription RECORD;
  tier_limit RECORD;
  current_usage INTEGER := 0;
  result JSONB;
BEGIN
  -- Get user's active subscription
  SELECT s.*, sp.tier INTO user_subscription
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON s.plan_id = sp.id
  WHERE s.user_id = check_user_id
    AND s.status = 'active'
    AND s.current_period_end > now()
  ORDER BY s.current_period_end DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'limit', 0,
      'usage', 0,
      'remaining', 0,
      'tier', 'free'
    );
  END IF;
  
  -- Get tier limit
  SELECT * INTO tier_limit
  FROM public.subscription_tier_limits
  WHERE plan_id = user_subscription.plan_id
    AND limit_type = limit_type_param;
  
  IF NOT FOUND THEN
    -- No limit defined means unlimited
    RETURN jsonb_build_object(
      'allowed', true,
      'limit', -1,
      'usage', 0,
      'remaining', -1,
      'tier', user_subscription.tier
    );
  END IF;
  
  -- Get current usage for this period
  SELECT COALESCE(SUM(quantity), 0) INTO current_usage
  FROM public.subscription_usage
  WHERE subscription_id = user_subscription.id
    AND metric_name = limit_type_param
    AND period_start >= user_subscription.current_period_start
    AND period_end <= user_subscription.current_period_end;
  
  -- Check if limit reached
  IF tier_limit.limit_value = -1 THEN
    -- Unlimited
    result := jsonb_build_object(
      'allowed', true,
      'limit', -1,
      'usage', current_usage,
      'remaining', -1,
      'tier', user_subscription.tier
    );
  ELSIF current_usage >= tier_limit.limit_value THEN
    result := jsonb_build_object(
      'allowed', false,
      'limit', tier_limit.limit_value,
      'usage', current_usage,
      'remaining', 0,
      'tier', user_subscription.tier
    );
  ELSE
    result := jsonb_build_object(
      'allowed', true,
      'limit', tier_limit.limit_value,
      'usage', current_usage,
      'remaining', tier_limit.limit_value - current_usage,
      'tier', user_subscription.tier
    );
  END IF;
  
  RETURN result;
END;
$$;

-- Insert default referral config
INSERT INTO public.referral_config (config_type, bonus_amount_euros, requirements, description) VALUES
('candidate_standard', 1000, '{"hired": true, "retention_days": 90}'::jsonb, 'Standard candidate referral bonus'),
('company_standard', 5000, '{"subscription_active": true, "retention_months": 3}'::jsonb, 'Standard company referral bonus'),
('company_premium', 10000, '{"subscription_tier": ["hunter", "elite"], "retention_months": 6}'::jsonb, 'Premium company referral bonus for Hunter/Elite plans'),
('executive_referral', 2500, '{"hired": true, "level": "executive", "retention_days": 90}'::jsonb, 'Executive-level candidate referral bonus')
ON CONFLICT (config_type) DO NOTHING;

-- Insert tier limits for each plan
INSERT INTO public.subscription_tier_limits (plan_id, limit_type, limit_value, period)
SELECT id, 'job_posts', 5, 'month' FROM public.subscription_plans WHERE tier = 'scout'
UNION ALL
SELECT id, 'applications', 50, 'month' FROM public.subscription_plans WHERE tier = 'scout'
UNION ALL
SELECT id, 'team_members', 3, 'month' FROM public.subscription_plans WHERE tier = 'scout'
UNION ALL
SELECT id, 'job_posts', -1, 'month' FROM public.subscription_plans WHERE tier = 'hunter'
UNION ALL
SELECT id, 'applications', 200, 'month' FROM public.subscription_plans WHERE tier = 'hunter'
UNION ALL
SELECT id, 'team_members', 10, 'month' FROM public.subscription_plans WHERE tier = 'hunter'
UNION ALL
SELECT id, 'api_calls', 10000, 'month' FROM public.subscription_plans WHERE tier = 'hunter'
UNION ALL
SELECT id, 'job_posts', -1, 'month' FROM public.subscription_plans WHERE tier = 'elite'
UNION ALL
SELECT id, 'applications', -1, 'month' FROM public.subscription_plans WHERE tier = 'elite'
UNION ALL
SELECT id, 'team_members', -1, 'month' FROM public.subscription_plans WHERE tier = 'elite'
UNION ALL
SELECT id, 'api_calls', -1, 'month' FROM public.subscription_plans WHERE tier = 'elite'
UNION ALL
SELECT id, 'applications', -1, 'month' FROM public.subscription_plans WHERE tier = 'pro'
UNION ALL
SELECT id, 'interview_prep_sessions', 10, 'month' FROM public.subscription_plans WHERE tier = 'pro'
UNION ALL
SELECT id, 'applications', -1, 'month' FROM public.subscription_plans WHERE tier = 'executive'
UNION ALL
SELECT id, 'interview_prep_sessions', -1, 'month' FROM public.subscription_plans WHERE tier = 'executive'
UNION ALL
SELECT id, 'coach_sessions', 4, 'month' FROM public.subscription_plans WHERE tier = 'executive'
ON CONFLICT (plan_id, limit_type) DO NOTHING;

-- Triggers
CREATE TRIGGER update_revenue_metrics_updated_at
  BEFORE UPDATE ON public.revenue_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_referral_bonuses_updated_at
  BEFORE UPDATE ON public.referral_bonuses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_referral_config_updated_at
  BEFORE UPDATE ON public.referral_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
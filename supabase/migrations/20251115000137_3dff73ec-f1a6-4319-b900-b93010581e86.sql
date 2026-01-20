-- =============================================
-- Subscription Management Tables
-- =============================================

-- Subscription plans catalog (local reference to Stripe products)
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_product_id TEXT NOT NULL UNIQUE,
  stripe_price_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  tier TEXT NOT NULL, -- 'scout', 'hunter', 'elite', 'pro', 'executive'
  user_type TEXT NOT NULL CHECK (user_type IN ('partner', 'candidate')),
  price_euros INTEGER NOT NULL,
  billing_interval TEXT NOT NULL DEFAULT 'month' CHECK (billing_interval IN ('month', 'year')),
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Active subscriptions (synced with Stripe)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'trialing', 'incomplete', 'incomplete_expired')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Usage tracking for metered billing
CREATE TABLE IF NOT EXISTS public.subscription_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL, -- 'api_calls', 'matches', 'applications', 'job_posts'
  quantity INTEGER NOT NULL DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(subscription_id, metric_name, period_start)
);

-- Payment history
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  stripe_invoice_id TEXT NOT NULL UNIQUE,
  stripe_payment_intent_id TEXT,
  amount_due INTEGER NOT NULL,
  amount_paid INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
  invoice_pdf_url TEXT,
  hosted_invoice_url TEXT,
  billing_reason TEXT,
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Stripe webhook events log
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processing_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- =============================================
-- Indexes for Performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_company_id ON public.subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_current_period_end ON public.subscriptions(current_period_end);

CREATE INDEX IF NOT EXISTS idx_subscription_usage_subscription_id ON public.subscription_usage(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_period ON public.subscription_usage(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON public.invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed ON public.stripe_webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_type ON public.stripe_webhook_events(event_type);

-- =============================================
-- RLS Policies
-- =============================================

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Subscription plans are public (anyone can view pricing)
CREATE POLICY "Anyone can view subscription plans"
  ON public.subscription_plans FOR SELECT
  USING (is_active = true);

-- Admin can manage plans
CREATE POLICY "Admins can manage subscription plans"
  ON public.subscription_plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Users can view their own subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- Company members can view company subscriptions
CREATE POLICY "Company members can view company subscriptions"
  ON public.subscriptions FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.company_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Admins and strategists can view all subscriptions
CREATE POLICY "Admins can view all subscriptions"
  ON public.subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'strategist')
    )
  );

-- Users can view their own usage
CREATE POLICY "Users can view their own subscription usage"
  ON public.subscription_usage FOR SELECT
  USING (
    subscription_id IN (
      SELECT id FROM public.subscriptions WHERE user_id = auth.uid()
    )
  );

-- Users can view their own invoices
CREATE POLICY "Users can view their own invoices"
  ON public.invoices FOR SELECT
  USING (user_id = auth.uid());

-- Admins can view all invoices
CREATE POLICY "Admins can view all invoices"
  ON public.invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Webhook events are system-only (no RLS policies for user access)

-- =============================================
-- Triggers
-- =============================================

CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Helper Functions
-- =============================================

-- Check if user has active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(check_user_id UUID, check_user_type TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.subscriptions s
    JOIN public.subscription_plans sp ON s.plan_id = sp.id
    WHERE s.user_id = check_user_id
      AND s.status = 'active'
      AND s.current_period_end > now()
      AND (check_user_type IS NULL OR sp.user_type = check_user_type)
  );
END;
$$;

-- Get user's current subscription plan
CREATE OR REPLACE FUNCTION public.get_user_subscription_plan(check_user_id UUID)
RETURNS TABLE(
  plan_name TEXT,
  tier TEXT,
  user_type TEXT,
  status TEXT,
  period_end TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.name,
    sp.tier,
    sp.user_type,
    s.status,
    s.current_period_end
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON s.plan_id = sp.id
  WHERE s.user_id = check_user_id
    AND s.status IN ('active', 'trialing')
  ORDER BY s.current_period_end DESC
  LIMIT 1;
END;
$$;
-- Sales KPI Framework Tables

-- 1. Sales Conversations Table (bridges company_interactions + emails)
CREATE TABLE public.sales_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  company_interaction_id UUID REFERENCES public.company_interactions(id) ON DELETE SET NULL,
  email_thread_id TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'linkedin', 'call', 'whatsapp', 'discord', 'in_app_message')),
  direction TEXT CHECK (direction IN ('inbound', 'outbound')),
  first_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,
  message_count INTEGER DEFAULT 1,
  is_qualified BOOLEAN DEFAULT false,
  qualification_stage TEXT CHECK (qualification_stage IN ('lead', 'mql', 'sql', 'opportunity')),
  qualification_date TIMESTAMPTZ,
  qualification_score INTEGER,
  resulted_in_booking BOOLEAN DEFAULT false,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  referral_mentioned BOOLEAN DEFAULT false,
  referral_source TEXT,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sentiment_trend NUMERIC,
  urgency_level TEXT CHECK (urgency_level IN ('low', 'medium', 'high', 'urgent')),
  next_action TEXT,
  next_action_due TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'stalled', 'closed_won', 'closed_lost')),
  source_utm JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Sales Proposals Table
CREATE TABLE public.sales_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.sales_conversations(id) ON DELETE SET NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  candidate_offer_id UUID REFERENCES public.candidate_offers(id) ON DELETE SET NULL,
  proposal_type TEXT CHECK (proposal_type IN ('placement', 'retainer', 'project', 'subscription')),
  title TEXT NOT NULL,
  proposal_value NUMERIC NOT NULL,
  currency TEXT DEFAULT 'EUR',
  discount_percentage NUMERIC DEFAULT 0,
  final_value NUMERIC,
  discovery_call_date TIMESTAMPTZ,
  proposal_created_at TIMESTAMPTZ DEFAULT NOW(),
  proposal_sent_at TIMESTAMPTZ,
  proposal_viewed_at TIMESTAMPTZ,
  proposal_expires_at TIMESTAMPTZ,
  response_deadline TIMESTAMPTZ,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'negotiating', 'accepted', 'rejected', 'expired')),
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  revision_count INTEGER DEFAULT 0,
  scope_changes JSONB DEFAULT '[]',
  competitor_mentioned TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. AI Outreach Logs Table
CREATE TABLE public.ai_outreach_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_usage_log_id UUID,
  ai_generated_content_id UUID REFERENCES public.ai_generated_content(id) ON DELETE SET NULL,
  outreach_type TEXT CHECK (outreach_type IN ('cold_email', 'follow_up', 'linkedin_message', 'linkedin_connect', 'linkedin_inmail', 'sms')),
  recipient_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  recipient_contact_id UUID,
  recipient_email TEXT,
  template_used TEXT,
  personalization_fields JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ,
  was_edited BOOLEAN DEFAULT false,
  edit_percentage NUMERIC,
  opened_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  reply_sentiment TEXT CHECK (reply_sentiment IN ('positive', 'neutral', 'negative')),
  resulted_in_booking BOOLEAN DEFAULT false,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  unsubscribed BOOLEAN DEFAULT false,
  bounce_type TEXT CHECK (bounce_type IN ('hard', 'soft')),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Sales Forecasts Table
CREATE TABLE public.sales_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  forecast_period DATE NOT NULL,
  forecast_type TEXT CHECK (forecast_type IN ('monthly', 'quarterly')),
  predicted_close_date DATE,
  predicted_value NUMERIC,
  weighted_value NUMERIC,
  probability_override NUMERIC,
  confidence_score NUMERIC,
  velocity_score NUMERIC,
  engagement_score NUMERIC,
  is_slipping BOOLEAN DEFAULT false,
  slip_days INTEGER,
  last_activity_type TEXT,
  last_activity_date TIMESTAMPTZ,
  risk_factors JSONB DEFAULT '[]',
  upside_factors JSONB DEFAULT '[]',
  forecast_notes TEXT,
  forecasted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ai_forecast_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Sales KPI Metrics Table
CREATE TABLE public.sales_kpi_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('conversational', 'meetings', 'proposals', 'closing', 'ai_efficiency', 'quality', 'forecasting')),
  kpi_name TEXT NOT NULL,
  value NUMERIC,
  previous_value NUMERIC,
  target_value NUMERIC,
  threshold_warning NUMERIC,
  threshold_critical NUMERIC,
  trend_direction TEXT CHECK (trend_direction IN ('up', 'down', 'stable')),
  trend_percentage NUMERIC,
  period_type TEXT DEFAULT 'daily' CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly')),
  period_start DATE,
  period_end DATE,
  rep_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  breakdown JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.sales_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_outreach_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_kpi_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sales_conversations
CREATE POLICY "Admins and strategists can view all sales conversations"
  ON public.sales_conversations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
  );

CREATE POLICY "Owners can view their sales conversations"
  ON public.sales_conversations FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Admins and strategists can manage sales conversations"
  ON public.sales_conversations FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
  );

-- RLS Policies for sales_proposals
CREATE POLICY "Admins and strategists can view all proposals"
  ON public.sales_proposals FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
  );

CREATE POLICY "Assigned users can view their proposals"
  ON public.sales_proposals FOR SELECT
  USING (assigned_to = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Admins and strategists can manage proposals"
  ON public.sales_proposals FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
  );

-- RLS Policies for ai_outreach_logs
CREATE POLICY "Admins and strategists can view all outreach logs"
  ON public.ai_outreach_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
  );

CREATE POLICY "Owners can view their outreach logs"
  ON public.ai_outreach_logs FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Admins and strategists can manage outreach logs"
  ON public.ai_outreach_logs FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
  );

-- RLS Policies for sales_forecasts
CREATE POLICY "Admins and strategists can view all forecasts"
  ON public.sales_forecasts FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
  );

CREATE POLICY "Admins and strategists can manage forecasts"
  ON public.sales_forecasts FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
  );

-- RLS Policies for sales_kpi_metrics
CREATE POLICY "Admins and strategists can view all KPIs"
  ON public.sales_kpi_metrics FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
  );

CREATE POLICY "Admins can manage KPIs"
  ON public.sales_kpi_metrics FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Indexes for performance
CREATE INDEX idx_sales_conversations_owner ON public.sales_conversations(owner_id);
CREATE INDEX idx_sales_conversations_company ON public.sales_conversations(company_id);
CREATE INDEX idx_sales_conversations_first_message ON public.sales_conversations(first_message_at);
CREATE INDEX idx_sales_conversations_status ON public.sales_conversations(status);
CREATE INDEX idx_sales_conversations_qualified ON public.sales_conversations(is_qualified);

CREATE INDEX idx_sales_proposals_company ON public.sales_proposals(company_id);
CREATE INDEX idx_sales_proposals_job ON public.sales_proposals(job_id);
CREATE INDEX idx_sales_proposals_status ON public.sales_proposals(status);
CREATE INDEX idx_sales_proposals_sent ON public.sales_proposals(proposal_sent_at);
CREATE INDEX idx_sales_proposals_assigned ON public.sales_proposals(assigned_to);

CREATE INDEX idx_ai_outreach_logs_owner ON public.ai_outreach_logs(owner_id);
CREATE INDEX idx_ai_outreach_logs_sent ON public.ai_outreach_logs(sent_at);
CREATE INDEX idx_ai_outreach_logs_type ON public.ai_outreach_logs(outreach_type);

CREATE INDEX idx_sales_forecasts_job ON public.sales_forecasts(job_id);
CREATE INDEX idx_sales_forecasts_period ON public.sales_forecasts(forecast_period);
CREATE INDEX idx_sales_forecasts_slipping ON public.sales_forecasts(is_slipping);

CREATE INDEX idx_sales_kpi_metrics_category ON public.sales_kpi_metrics(category);
CREATE INDEX idx_sales_kpi_metrics_period ON public.sales_kpi_metrics(period_type, period_start);
CREATE INDEX idx_sales_kpi_metrics_rep ON public.sales_kpi_metrics(rep_id);
CREATE INDEX idx_sales_kpi_metrics_calculated ON public.sales_kpi_metrics(calculated_at);

-- Auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_sales_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_sales_conversations_updated_at
  BEFORE UPDATE ON public.sales_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_sales_updated_at();

CREATE TRIGGER update_sales_proposals_updated_at
  BEFORE UPDATE ON public.sales_proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_sales_updated_at();

CREATE TRIGGER update_sales_forecasts_updated_at
  BEFORE UPDATE ON public.sales_forecasts
  FOR EACH ROW EXECUTE FUNCTION public.update_sales_updated_at();

-- Auto-calculate final_value on sales_proposals
CREATE OR REPLACE FUNCTION public.calculate_proposal_final_value()
RETURNS TRIGGER AS $$
BEGIN
  NEW.final_value = NEW.proposal_value * (1 - COALESCE(NEW.discount_percentage, 0) / 100);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER calculate_proposal_final_value_trigger
  BEFORE INSERT OR UPDATE ON public.sales_proposals
  FOR EACH ROW EXECUTE FUNCTION public.calculate_proposal_final_value();

-- Auto-populate sales_conversations from company_interactions
CREATE OR REPLACE FUNCTION public.auto_create_sales_conversation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.interaction_type IN ('call', 'email', 'meeting') THEN
    INSERT INTO public.sales_conversations (
      company_id,
      company_interaction_id,
      channel,
      direction,
      first_message_at,
      last_message_at,
      owner_id,
      sentiment_trend
    ) VALUES (
      NEW.company_id,
      NEW.id,
      CASE WHEN NEW.interaction_type = 'call' THEN 'call' ELSE 'email' END,
      NEW.direction,
      COALESCE(NEW.interaction_date, NOW()),
      COALESCE(NEW.interaction_date, NOW()),
      NEW.created_by,
      NEW.sentiment_score
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER auto_create_sales_conversation_trigger
  AFTER INSERT ON public.company_interactions
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_sales_conversation();

-- Detect slipping deals function
CREATE OR REPLACE FUNCTION public.detect_slipping_deals()
RETURNS void AS $$
BEGIN
  UPDATE public.sales_forecasts sf
  SET 
    is_slipping = true,
    slip_days = EXTRACT(DAY FROM NOW() - last_activity_date)::INTEGER
  WHERE last_activity_date < NOW() - INTERVAL '14 days'
    AND is_slipping = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
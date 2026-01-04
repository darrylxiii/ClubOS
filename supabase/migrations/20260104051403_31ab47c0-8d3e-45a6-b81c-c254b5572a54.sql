-- Enterprise Contracts for $100M Readiness
CREATE TABLE IF NOT EXISTS public.enterprise_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  contract_type TEXT NOT NULL DEFAULT 'standard' CHECK (contract_type IN ('standard', 'enterprise', 'strategic', 'partnership')),
  contract_number TEXT UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE,
  term_months INTEGER DEFAULT 12,
  auto_renewal BOOLEAN DEFAULT true,
  annual_value NUMERIC(12, 2) DEFAULT 0,
  total_contract_value NUMERIC(12, 2) DEFAULT 0,
  payment_terms_days INTEGER DEFAULT 30,
  annual_escalator_percent NUMERIC(5, 2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'active', 'expired', 'cancelled', 'renewed')),
  signed_date DATE,
  signed_by TEXT,
  terms_accepted BOOLEAN DEFAULT false,
  special_terms JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Contract Renewals Tracking
CREATE TABLE IF NOT EXISTS public.contract_renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.enterprise_contracts(id) ON DELETE CASCADE,
  renewal_date DATE NOT NULL,
  previous_annual_value NUMERIC(12, 2),
  new_annual_value NUMERIC(12, 2),
  escalator_applied NUMERIC(5, 2),
  renewal_status TEXT DEFAULT 'pending' CHECK (renewal_status IN ('pending', 'renewed', 'cancelled', 'upgraded', 'downgraded')),
  renewal_notes TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Activation Events for Funnel Tracking
CREATE TABLE IF NOT EXISTS public.activation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL DEFAULT 'general' CHECK (event_category IN ('signup', 'onboarding', 'engagement', 'conversion', 'retention', 'referral')),
  milestone_name TEXT,
  milestone_order INTEGER,
  event_data JSONB DEFAULT '{}',
  session_id TEXT,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Investor Metrics Snapshots (for due diligence)
CREATE TABLE IF NOT EXISTS public.investor_metrics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  snapshot_type TEXT DEFAULT 'daily' CHECK (snapshot_type IN ('daily', 'weekly', 'monthly', 'quarterly')),
  arr NUMERIC(14, 2) DEFAULT 0,
  mrr NUMERIC(14, 2) DEFAULT 0,
  revenue_ytd NUMERIC(14, 2) DEFAULT 0,
  revenue_growth_mom NUMERIC(8, 4),
  revenue_growth_yoy NUMERIC(8, 4),
  total_customers INTEGER DEFAULT 0,
  active_customers INTEGER DEFAULT 0,
  new_customers_mtd INTEGER DEFAULT 0,
  churned_customers_mtd INTEGER DEFAULT 0,
  cac NUMERIC(10, 2),
  ltv NUMERIC(12, 2),
  ltv_cac_ratio NUMERIC(8, 4),
  payback_months NUMERIC(6, 2),
  gross_retention NUMERIC(8, 4),
  net_revenue_retention NUMERIC(8, 4),
  logo_retention NUMERIC(8, 4),
  pipeline_value NUMERIC(14, 2) DEFAULT 0,
  weighted_pipeline NUMERIC(14, 2) DEFAULT 0,
  deal_count INTEGER DEFAULT 0,
  avg_deal_size NUMERIC(12, 2),
  total_users INTEGER DEFAULT 0,
  active_users_mau INTEGER DEFAULT 0,
  total_candidates INTEGER DEFAULT 0,
  total_applications INTEGER DEFAULT 0,
  total_placements INTEGER DEFAULT 0,
  placement_rate NUMERIC(8, 4),
  avg_time_to_hire_days NUMERIC(6, 2),
  nps_score NUMERIC(5, 2),
  csat_score NUMERIC(5, 2),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(snapshot_date, snapshot_type)
);

-- SLA Tracking
CREATE TABLE IF NOT EXISTS public.sla_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.enterprise_contracts(id) ON DELETE SET NULL,
  sla_type TEXT NOT NULL CHECK (sla_type IN ('uptime', 'response_time', 'resolution_time', 'support', 'data_retention')),
  sla_name TEXT NOT NULL,
  target_value NUMERIC(10, 4) NOT NULL,
  target_unit TEXT NOT NULL,
  measurement_period TEXT DEFAULT 'monthly',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sla_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sla_commitment_id UUID NOT NULL REFERENCES public.sla_commitments(id) ON DELETE CASCADE,
  violation_date DATE NOT NULL,
  actual_value NUMERIC(10, 4) NOT NULL,
  target_value NUMERIC(10, 4) NOT NULL,
  variance NUMERIC(10, 4),
  root_cause TEXT,
  remediation TEXT,
  credit_issued NUMERIC(10, 2) DEFAULT 0,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Revenue Cohort Analysis
CREATE TABLE IF NOT EXISTS public.revenue_cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_month DATE NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  month_number INTEGER NOT NULL,
  revenue NUMERIC(12, 2) DEFAULT 0,
  cumulative_revenue NUMERIC(14, 2) DEFAULT 0,
  is_retained BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cohort_month, company_id, month_number)
);

-- Enable RLS
ALTER TABLE public.enterprise_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_renewals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_metrics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_cohorts ENABLE ROW LEVEL SECURITY;

-- RLS Policies using user_roles table for admin check
CREATE POLICY "admin_enterprise_contracts" ON public.enterprise_contracts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_contract_renewals" ON public.contract_renewals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "users_own_activation_events" ON public.activation_events
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "insert_activation_events" ON public.activation_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "admin_investor_metrics" ON public.investor_metrics_snapshots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_sla_commitments" ON public.sla_commitments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_sla_violations" ON public.sla_violations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_revenue_cohorts" ON public.revenue_cohorts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_enterprise_contracts_company ON public.enterprise_contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_contracts_status ON public.enterprise_contracts(status);
CREATE INDEX IF NOT EXISTS idx_activation_events_user ON public.activation_events(user_id);
CREATE INDEX IF NOT EXISTS idx_activation_events_type ON public.activation_events(event_type, event_category);
CREATE INDEX IF NOT EXISTS idx_activation_events_date ON public.activation_events(created_at);
CREATE INDEX IF NOT EXISTS idx_investor_metrics_date ON public.investor_metrics_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_revenue_cohorts_month ON public.revenue_cohorts(cohort_month);

-- Contract number sequence and trigger
CREATE SEQUENCE IF NOT EXISTS contract_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_contract_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contract_number IS NULL THEN
    NEW.contract_number := 'TQC-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('contract_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_contract_number ON public.enterprise_contracts;
CREATE TRIGGER set_contract_number
  BEFORE INSERT ON public.enterprise_contracts
  FOR EACH ROW
  EXECUTE FUNCTION generate_contract_number();

-- Investor metrics snapshot function
CREATE OR REPLACE FUNCTION capture_investor_metrics_snapshot(p_snapshot_type TEXT DEFAULT 'daily')
RETURNS UUID AS $$
DECLARE
  v_snapshot_id UUID;
  v_arr NUMERIC;
  v_mrr NUMERIC;
  v_revenue_ytd NUMERIC;
  v_total_customers INTEGER;
  v_active_customers INTEGER;
  v_total_users INTEGER;
  v_total_candidates INTEGER;
  v_total_applications INTEGER;
  v_total_placements INTEGER;
  v_pipeline_value NUMERIC;
  v_weighted_pipeline NUMERIC;
  v_deal_count INTEGER;
BEGIN
  SELECT COALESCE(SUM(annual_value), 0) INTO v_arr
  FROM public.enterprise_contracts WHERE status = 'active';
  v_mrr := v_arr / 12;
  
  SELECT COALESCE(SUM(total_amount), 0) INTO v_revenue_ytd
  FROM public.moneybird_sales_invoices
  WHERE state_normalized = 'paid' AND EXTRACT(YEAR FROM invoice_date::date) = EXTRACT(YEAR FROM CURRENT_DATE);
  
  SELECT COUNT(*) INTO v_total_customers FROM public.companies WHERE is_partner = true;
  SELECT COUNT(DISTINCT partner_company_id) INTO v_active_customers 
  FROM public.placement_fees WHERE created_at > NOW() - INTERVAL '12 months';
  
  SELECT COUNT(*) INTO v_total_users FROM public.profiles;
  SELECT COUNT(*) INTO v_total_candidates FROM public.candidate_profiles;
  SELECT COUNT(*) INTO v_total_applications FROM public.applications;
  SELECT COUNT(*) INTO v_total_placements FROM public.applications WHERE status = 'hired';
  
  SELECT COALESCE(SUM(fee_amount), 0), COALESCE(SUM(fee_amount * 0.3), 0), COUNT(*)
  INTO v_pipeline_value, v_weighted_pipeline, v_deal_count
  FROM public.placement_fees WHERE status IN ('pending', 'invoiced');
  
  INSERT INTO public.investor_metrics_snapshots (
    snapshot_date, snapshot_type, arr, mrr, revenue_ytd,
    total_customers, active_customers, total_users, total_candidates, 
    total_applications, total_placements, placement_rate,
    pipeline_value, weighted_pipeline, deal_count, avg_deal_size
  ) VALUES (
    CURRENT_DATE, p_snapshot_type, v_arr, v_mrr, v_revenue_ytd,
    v_total_customers, v_active_customers, v_total_users, v_total_candidates, 
    v_total_applications, v_total_placements,
    CASE WHEN v_total_applications > 0 THEN v_total_placements::NUMERIC / v_total_applications ELSE 0 END,
    v_pipeline_value, v_weighted_pipeline, v_deal_count,
    CASE WHEN v_deal_count > 0 THEN v_pipeline_value / v_deal_count ELSE 0 END
  )
  ON CONFLICT (snapshot_date, snapshot_type) DO UPDATE SET
    arr = EXCLUDED.arr, mrr = EXCLUDED.mrr, revenue_ytd = EXCLUDED.revenue_ytd,
    total_customers = EXCLUDED.total_customers, active_customers = EXCLUDED.active_customers,
    total_users = EXCLUDED.total_users, total_candidates = EXCLUDED.total_candidates,
    total_applications = EXCLUDED.total_applications, total_placements = EXCLUDED.total_placements,
    placement_rate = EXCLUDED.placement_rate, pipeline_value = EXCLUDED.pipeline_value,
    weighted_pipeline = EXCLUDED.weighted_pipeline, deal_count = EXCLUDED.deal_count, avg_deal_size = EXCLUDED.avg_deal_size
  RETURNING id INTO v_snapshot_id;
  
  RETURN v_snapshot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
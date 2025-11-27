-- Phase 2 & 4: Enterprise Tables (without policies first)
CREATE TABLE IF NOT EXISTS public.partner_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'draft',
  due_date DATE,
  paid_at TIMESTAMPTZ,
  invoice_url TEXT,
  line_items JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT partner_invoices_status_check CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS public.company_sso_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  entity_id TEXT,
  sso_url TEXT,
  certificate TEXT,
  metadata_url TEXT,
  client_id TEXT,
  client_secret TEXT,
  allowed_domains TEXT[] DEFAULT ARRAY[]::TEXT[],
  auto_provision BOOLEAN DEFAULT true,
  default_role TEXT DEFAULT 'partner',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT company_sso_config_provider_check CHECK (provider IN ('saml', 'oidc', 'google', 'microsoft'))
);

CREATE TABLE IF NOT EXISTS public.partner_sla_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  response_time_hours INTEGER DEFAULT 24,
  shortlist_delivery_hours INTEGER DEFAULT 48,
  replacement_guarantee_days INTEGER DEFAULT 90,
  interview_scheduling_hours INTEGER DEFAULT 48,
  is_active BOOLEAN DEFAULT true,
  penalties JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_sla_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  target_value INTEGER NOT NULL,
  actual_value INTEGER,
  is_met BOOLEAN,
  reference_id UUID,
  reference_type TEXT,
  measured_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT partner_sla_tracking_metric_check CHECK (metric_type IN ('response_time', 'shortlist_delivery', 'interview_scheduling', 'replacement'))
);

CREATE INDEX IF NOT EXISTS idx_partner_sla_tracking_company ON public.partner_sla_tracking(company_id);
CREATE INDEX IF NOT EXISTS idx_partner_sla_tracking_metric ON public.partner_sla_tracking(metric_type);

CREATE TABLE IF NOT EXISTS public.partner_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  api_key_encrypted TEXT,
  webhook_url TEXT,
  webhook_secret TEXT,
  sync_frequency TEXT DEFAULT 'hourly',
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending',
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT partner_integrations_type_check CHECK (integration_type IN ('greenhouse', 'lever', 'workday', 'successfactors', 'slack', 'teams')),
  CONSTRAINT partner_integrations_frequency_check CHECK (sync_frequency IN ('realtime', 'hourly', 'daily', 'manual'))
);

CREATE INDEX IF NOT EXISTS idx_partner_integrations_company ON public.partner_integrations(company_id);
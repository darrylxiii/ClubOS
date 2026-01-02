-- Moneybird Integration Tables

-- Store OAuth tokens and preferences per user/admin
CREATE TABLE public.moneybird_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  administration_id TEXT NOT NULL,
  administration_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  auto_create_invoices BOOLEAN DEFAULT false,
  auto_send_invoices BOOLEAN DEFAULT false,
  default_tax_rate_id TEXT,
  sync_preferences JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, administration_id)
);

-- Map TQC companies to Moneybird contacts
CREATE TABLE public.moneybird_contact_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  moneybird_contact_id TEXT NOT NULL,
  moneybird_administration_id TEXT NOT NULL,
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'error')),
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  sync_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, moneybird_administration_id)
);

-- Map TQC invoices to Moneybird invoices
CREATE TABLE public.moneybird_invoice_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_invoice_id UUID NOT NULL REFERENCES public.partner_invoices(id) ON DELETE CASCADE,
  moneybird_invoice_id TEXT NOT NULL,
  moneybird_administration_id TEXT NOT NULL,
  moneybird_status TEXT DEFAULT 'draft',
  external_url TEXT,
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'error')),
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  sync_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(partner_invoice_id, moneybird_administration_id)
);

-- Audit trail for all Moneybird operations
CREATE TABLE public.moneybird_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  operation_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  request_payload JSONB,
  response_payload JSONB,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_moneybird_settings_user ON public.moneybird_settings(user_id);
CREATE INDEX idx_moneybird_settings_active ON public.moneybird_settings(is_active) WHERE is_active = true;
CREATE INDEX idx_moneybird_contact_sync_company ON public.moneybird_contact_sync(company_id);
CREATE INDEX idx_moneybird_contact_sync_status ON public.moneybird_contact_sync(sync_status);
CREATE INDEX idx_moneybird_invoice_sync_invoice ON public.moneybird_invoice_sync(partner_invoice_id);
CREATE INDEX idx_moneybird_invoice_sync_status ON public.moneybird_invoice_sync(sync_status);
CREATE INDEX idx_moneybird_sync_logs_created ON public.moneybird_sync_logs(created_at DESC);
CREATE INDEX idx_moneybird_sync_logs_entity ON public.moneybird_sync_logs(entity_type, entity_id);

-- Enable RLS
ALTER TABLE public.moneybird_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moneybird_contact_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moneybird_invoice_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moneybird_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for moneybird_settings (admin only)
CREATE POLICY "Admins can view moneybird settings"
  ON public.moneybird_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admins can manage moneybird settings"
  ON public.moneybird_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- RLS Policies for contact sync (admin/strategist)
CREATE POLICY "Admins can view contact sync"
  ON public.moneybird_contact_sync FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admins can manage contact sync"
  ON public.moneybird_contact_sync FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- RLS Policies for invoice sync (admin/strategist)
CREATE POLICY "Admins can view invoice sync"
  ON public.moneybird_invoice_sync FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admins can manage invoice sync"
  ON public.moneybird_invoice_sync FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- RLS Policies for sync logs (admin only)
CREATE POLICY "Admins can view sync logs"
  ON public.moneybird_sync_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "System can insert sync logs"
  ON public.moneybird_sync_logs FOR INSERT
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_moneybird_settings_updated_at
  BEFORE UPDATE ON public.moneybird_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_moneybird_contact_sync_updated_at
  BEFORE UPDATE ON public.moneybird_contact_sync
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_moneybird_invoice_sync_updated_at
  BEFORE UPDATE ON public.moneybird_invoice_sync
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 1. Create legal_entities reference table
CREATE TABLE public.legal_entities (
  code text PRIMARY KEY,
  display_name text NOT NULL,
  country_code text NOT NULL,
  currency_code text NOT NULL DEFAULT 'EUR',
  vat_rate numeric NOT NULL DEFAULT 0,
  vat_number text,
  company_registration text,
  bank_name text,
  bank_iban text,
  bank_bic text,
  bank_account_holder text,
  address_line1 text,
  address_line2 text,
  city text,
  postal_code text,
  country text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.legal_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and strategists can read legal entities"
  ON public.legal_entities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admins can manage legal entities"
  ON public.legal_entities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

INSERT INTO public.legal_entities (code, display_name, country_code, currency_code, vat_rate, country)
VALUES 
  ('tqc_nl', 'The Quantum Club B.V.', 'NL', 'EUR', 21, 'Netherlands'),
  ('tqc_dubai', 'The Quantum Club FZ-LLC', 'AE', 'EUR', 5, 'United Arab Emirates');

ALTER TABLE public.placement_fees ADD COLUMN legal_entity text DEFAULT 'tqc_nl' REFERENCES public.legal_entities(code);
ALTER TABLE public.moneybird_sales_invoices ADD COLUMN legal_entity text DEFAULT 'tqc_nl' REFERENCES public.legal_entities(code);
ALTER TABLE public.moneybird_financial_metrics ADD COLUMN legal_entity text DEFAULT 'tqc_nl' REFERENCES public.legal_entities(code);
ALTER TABLE public.operating_expenses ADD COLUMN legal_entity text DEFAULT 'tqc_nl' REFERENCES public.legal_entities(code);
ALTER TABLE public.employee_commissions ADD COLUMN legal_entity text DEFAULT 'tqc_nl' REFERENCES public.legal_entities(code);
ALTER TABLE public.referral_payouts ADD COLUMN legal_entity text DEFAULT 'tqc_nl' REFERENCES public.legal_entities(code);
ALTER TABLE public.financial_events ADD COLUMN legal_entity text DEFAULT 'tqc_nl' REFERENCES public.legal_entities(code);
ALTER TABLE public.vendor_subscriptions ADD COLUMN legal_entity text DEFAULT 'tqc_nl' REFERENCES public.legal_entities(code);
ALTER TABLE public.financial_forecasts ADD COLUMN legal_entity text DEFAULT 'tqc_nl' REFERENCES public.legal_entities(code);
ALTER TABLE public.moneybird_settings ADD COLUMN legal_entity text DEFAULT 'tqc_nl' REFERENCES public.legal_entities(code);

CREATE INDEX idx_placement_fees_legal_entity ON public.placement_fees(legal_entity);
CREATE INDEX idx_moneybird_invoices_legal_entity ON public.moneybird_sales_invoices(legal_entity);
CREATE INDEX idx_moneybird_metrics_legal_entity ON public.moneybird_financial_metrics(legal_entity);
CREATE INDEX idx_operating_expenses_legal_entity ON public.operating_expenses(legal_entity);
CREATE INDEX idx_employee_commissions_legal_entity ON public.employee_commissions(legal_entity);

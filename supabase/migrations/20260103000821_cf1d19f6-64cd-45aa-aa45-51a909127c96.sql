-- Phase 1: Add company_id and placement_fee_id to moneybird_sales_invoices for reconciliation
ALTER TABLE public.moneybird_sales_invoices 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id),
ADD COLUMN IF NOT EXISTS placement_fee_id UUID REFERENCES public.placement_fees(id),
ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES public.applications(id),
ADD COLUMN IF NOT EXISTS reconciliation_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS reconciliation_notes TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_moneybird_invoices_company ON public.moneybird_sales_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_moneybird_invoices_placement_fee ON public.moneybird_sales_invoices(placement_fee_id);
CREATE INDEX IF NOT EXISTS idx_moneybird_invoices_reconciliation ON public.moneybird_sales_invoices(reconciliation_status);

-- Phase 3: Add revenue metrics to companies table
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS total_revenue NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_paid NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_outstanding NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS revenue_tier TEXT DEFAULT 'new',
ADD COLUMN IF NOT EXISTS payment_reliability_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS invoice_count INTEGER DEFAULT 0;

-- Create index for revenue tier filtering
CREATE INDEX IF NOT EXISTS idx_companies_revenue_tier ON public.companies(revenue_tier);

-- Create financial_events table for event sourcing (Phase 7)
CREATE TABLE IF NOT EXISTS public.financial_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  company_id UUID REFERENCES public.companies(id),
  amount NUMERIC,
  currency TEXT DEFAULT 'EUR',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  is_processed BOOLEAN DEFAULT false
);

-- Enable RLS on financial_events
ALTER TABLE public.financial_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for financial_events (admin only via user_roles table)
CREATE POLICY "Admin full access to financial events"
  ON public.financial_events
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  );

-- Service role policy for edge functions
CREATE POLICY "Service role access to financial events"
  ON public.financial_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create index for event processing
CREATE INDEX IF NOT EXISTS idx_financial_events_unprocessed ON public.financial_events(is_processed) WHERE is_processed = false;
CREATE INDEX IF NOT EXISTS idx_financial_events_type ON public.financial_events(event_type);
CREATE INDEX IF NOT EXISTS idx_financial_events_company ON public.financial_events(company_id);
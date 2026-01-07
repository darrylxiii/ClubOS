-- =====================================================
-- VAT Integration: Add VAT columns and tracking tables
-- =====================================================

-- 1. Add VAT columns to moneybird_sales_invoices
ALTER TABLE public.moneybird_sales_invoices 
ADD COLUMN IF NOT EXISTS net_amount NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS vat_amount NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS vat_rate NUMERIC DEFAULT 21.00,
ADD COLUMN IF NOT EXISTS vat_type TEXT DEFAULT 'standard';

-- Add comment for vat_type values
COMMENT ON COLUMN public.moneybird_sales_invoices.vat_type IS 'VAT type: standard (21%), reduced (9%), zero (0%), reverse_charge, export, exempt';

-- 2. Create VAT Register table for quarterly BTW-aangifte tracking
CREATE TABLE IF NOT EXISTS public.vat_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_type TEXT NOT NULL DEFAULT 'quarter',
  period_year INTEGER NOT NULL,
  period_number INTEGER NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  vat_collected NUMERIC NOT NULL DEFAULT 0,
  vat_collected_outstanding NUMERIC NOT NULL DEFAULT 0,
  vat_input NUMERIC NOT NULL DEFAULT 0,
  vat_net_payable NUMERIC GENERATED ALWAYS AS (vat_collected - vat_input) STORED,
  net_revenue NUMERIC NOT NULL DEFAULT 0,
  gross_revenue NUMERIC NOT NULL DEFAULT 0,
  invoice_count INTEGER NOT NULL DEFAULT 0,
  filing_status TEXT DEFAULT 'pending',
  filing_date DATE,
  payment_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(period_type, period_year, period_number)
);

-- Enable RLS on vat_register
ALTER TABLE public.vat_register ENABLE ROW LEVEL SECURITY;

-- Admin-only policy for VAT register (using user_roles table)
CREATE POLICY "Admins can manage VAT register"
ON public.vat_register
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 3. Add VAT fields to moneybird_financial_metrics
ALTER TABLE public.moneybird_financial_metrics
ADD COLUMN IF NOT EXISTS net_revenue NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS vat_collected NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS vat_outstanding NUMERIC DEFAULT 0;

-- 4. Backfill existing invoices with calculated VAT (21% Dutch standard rate)
UPDATE public.moneybird_sales_invoices 
SET 
  net_amount = ROUND(total_amount / 1.21, 2),
  vat_amount = ROUND(total_amount - (total_amount / 1.21), 2),
  vat_rate = 21.00,
  vat_type = 'standard'
WHERE (net_amount = 0 OR net_amount IS NULL) AND total_amount > 0;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_moneybird_invoices_vat_type 
ON public.moneybird_sales_invoices(vat_type);

CREATE INDEX IF NOT EXISTS idx_vat_register_period 
ON public.vat_register(period_year, period_number);

-- 6. Create trigger for updated_at on vat_register
CREATE OR REPLACE FUNCTION update_vat_register_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_vat_register_updated_at ON public.vat_register;
CREATE TRIGGER update_vat_register_updated_at
  BEFORE UPDATE ON public.vat_register
  FOR EACH ROW
  EXECUTE FUNCTION update_vat_register_timestamp();
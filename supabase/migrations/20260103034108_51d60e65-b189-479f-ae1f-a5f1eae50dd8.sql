-- Add enhanced reconciliation fields to moneybird_sales_invoices
ALTER TABLE public.moneybird_sales_invoices
ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'placement_fee',
ADD COLUMN IF NOT EXISTS variance_reason TEXT,
ADD COLUMN IF NOT EXISTS variance_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS reconciliation_confidence TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS requires_finance_review BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reconciled_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'net_30';

-- Add index for finance review queue
CREATE INDEX IF NOT EXISTS idx_moneybird_invoices_finance_review 
ON public.moneybird_sales_invoices(requires_finance_review) 
WHERE requires_finance_review = true;

-- Add index for invoice type analysis
CREATE INDEX IF NOT EXISTS idx_moneybird_invoices_type 
ON public.moneybird_sales_invoices(invoice_type);

-- Add comment for documentation
COMMENT ON COLUMN public.moneybird_sales_invoices.invoice_type IS 'Type of invoice: placement_fee, retainer, consulting, credit_note, other';
COMMENT ON COLUMN public.moneybird_sales_invoices.variance_reason IS 'Explanation for amount discrepancy between invoice and expected placement fee';
COMMENT ON COLUMN public.moneybird_sales_invoices.reconciliation_confidence IS 'How the reconciliation was done: auto, manual, verified';
COMMENT ON COLUMN public.moneybird_sales_invoices.requires_finance_review IS 'Flag for finance team to review exceptions';
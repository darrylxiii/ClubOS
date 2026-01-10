-- Add VAT tracking columns to moneybird_financial_metrics for transparency
ALTER TABLE public.moneybird_financial_metrics 
ADD COLUMN IF NOT EXISTS total_revenue_gross NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS vat_amount NUMERIC DEFAULT 0;

-- Add comments for clarity
COMMENT ON COLUMN public.moneybird_financial_metrics.total_revenue IS 'Revenue excluding VAT (net amount)';
COMMENT ON COLUMN public.moneybird_financial_metrics.total_revenue_gross IS 'Revenue including VAT (gross amount)';
COMMENT ON COLUMN public.moneybird_financial_metrics.vat_amount IS 'VAT amount (21% Dutch BTW)';
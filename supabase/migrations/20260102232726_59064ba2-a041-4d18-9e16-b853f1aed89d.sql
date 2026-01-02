-- Create table for individual Moneybird invoices (for debugging and accurate metrics)
CREATE TABLE public.moneybird_sales_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  moneybird_id TEXT NOT NULL UNIQUE,
  invoice_number TEXT,
  contact_id TEXT,
  contact_name TEXT,
  state_raw TEXT,
  state_normalized TEXT NOT NULL DEFAULT 'unknown',
  invoice_date DATE,
  due_date DATE,
  paid_at TIMESTAMP WITH TIME ZONE,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  unpaid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  year INTEGER NOT NULL,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.moneybird_sales_invoices ENABLE ROW LEVEL SECURITY;

-- Create admin-only policy (matching moneybird_financial_metrics pattern)
CREATE POLICY "Admins can manage invoices"
  ON public.moneybird_sales_invoices
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role])
    )
  );

-- Create indexes for common queries
CREATE INDEX idx_moneybird_invoices_year ON public.moneybird_sales_invoices(year);
CREATE INDEX idx_moneybird_invoices_state ON public.moneybird_sales_invoices(state_normalized);
CREATE INDEX idx_moneybird_invoices_date ON public.moneybird_sales_invoices(invoice_date);

-- Add trigger for updated_at
CREATE TRIGGER update_moneybird_invoices_updated_at
  BEFORE UPDATE ON public.moneybird_sales_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
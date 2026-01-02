-- Create table for storing Moneybird financial metrics snapshots
CREATE TABLE public.moneybird_financial_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_revenue NUMERIC(15,2) DEFAULT 0,
  total_paid NUMERIC(15,2) DEFAULT 0,
  total_outstanding NUMERIC(15,2) DEFAULT 0,
  gross_profit NUMERIC(15,2) DEFAULT 0,
  invoice_count_paid INTEGER DEFAULT 0,
  invoice_count_open INTEGER DEFAULT 0,
  invoice_count_late INTEGER DEFAULT 0,
  revenue_by_month JSONB DEFAULT '[]'::jsonb,
  top_clients JSONB DEFAULT '[]'::jsonb,
  payment_aging JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sync_date, period_start, period_end)
);

-- Enable RLS
ALTER TABLE public.moneybird_financial_metrics ENABLE ROW LEVEL SECURITY;

-- Allow admins to read/write
CREATE POLICY "Admins can manage financial metrics"
  ON public.moneybird_financial_metrics
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  );

-- Create index for efficient queries
CREATE INDEX idx_moneybird_metrics_sync_date ON public.moneybird_financial_metrics(sync_date DESC);
CREATE INDEX idx_moneybird_metrics_period ON public.moneybird_financial_metrics(period_start, period_end);
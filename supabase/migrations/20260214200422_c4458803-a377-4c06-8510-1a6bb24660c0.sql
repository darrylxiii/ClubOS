
-- New table: subscription_budgets
CREATE TABLE public.subscription_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  budget_amount NUMERIC NOT NULL DEFAULT 0,
  period_type TEXT NOT NULL DEFAULT 'monthly',
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage subscription budgets"
  ON public.subscription_budgets FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
  );

-- Add ROI and expense-linking columns to vendor_subscriptions
ALTER TABLE public.vendor_subscriptions
  ADD COLUMN IF NOT EXISTS revenue_attribution TEXT,
  ADD COLUMN IF NOT EXISTS roi_notes TEXT,
  ADD COLUMN IF NOT EXISTS operating_expense_category_id UUID REFERENCES public.expense_categories(id);

-- Trigger for updated_at on subscription_budgets
CREATE TRIGGER update_subscription_budgets_updated_at
  BEFORE UPDATE ON public.subscription_budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

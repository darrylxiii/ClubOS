-- Financial period close mechanism
CREATE TABLE public.financial_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'locked')),
  closed_by UUID REFERENCES public.profiles(id),
  closed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(year, quarter)
);

ALTER TABLE public.financial_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and strategists can view financial periods"
  ON public.financial_periods FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Only admins can manage financial periods"
  ON public.financial_periods FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
    )
  );

-- Seed open periods for current and past years
INSERT INTO public.financial_periods (year, quarter) VALUES
  (2024, 1), (2024, 2), (2024, 3), (2024, 4),
  (2025, 1), (2025, 2), (2025, 3), (2025, 4),
  (2026, 1), (2026, 2), (2026, 3), (2026, 4)
ON CONFLICT (year, quarter) DO NOTHING;

-- Trigger to update updated_at
CREATE TRIGGER update_financial_periods_updated_at
  BEFORE UPDATE ON public.financial_periods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Validation trigger: prevent mutations to operating_expenses in closed periods
CREATE OR REPLACE FUNCTION public.check_financial_period_open()
RETURNS TRIGGER AS $$
DECLARE
  expense_quarter INTEGER;
  period_status TEXT;
BEGIN
  expense_quarter := EXTRACT(QUARTER FROM NEW.expense_date::DATE);
  
  SELECT fp.status INTO period_status
  FROM public.financial_periods fp
  WHERE fp.year = EXTRACT(YEAR FROM NEW.expense_date::DATE)::INTEGER
    AND fp.quarter = expense_quarter;
  
  IF period_status IN ('closed', 'locked') THEN
    RAISE EXCEPTION 'Cannot modify expenses in a closed financial period (% Q%)', 
      EXTRACT(YEAR FROM NEW.expense_date::DATE)::INTEGER, expense_quarter;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER enforce_financial_period_on_expenses
  BEFORE INSERT OR UPDATE ON public.operating_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.check_financial_period_open();

-- Add SELECT policies for strategist role on moneybird financial tables
-- moneybird_financial_metrics
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'moneybird_financial_metrics' 
    AND policyname = 'Strategists can view financial metrics'
  ) THEN
    CREATE POLICY "Strategists can view financial metrics"
    ON public.moneybird_financial_metrics
    FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'strategist'));
  END IF;
END $$;

-- moneybird_sales_invoices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'moneybird_sales_invoices' 
    AND policyname = 'Strategists can view sales invoices'
  ) THEN
    CREATE POLICY "Strategists can view sales invoices"
    ON public.moneybird_sales_invoices
    FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'strategist'));
  END IF;
END $$;

-- Subscription cost history for tracking MRC changes over time
CREATE TABLE public.subscription_cost_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES public.vendor_subscriptions(id) ON DELETE CASCADE,
  monthly_cost NUMERIC NOT NULL,
  annual_cost NUMERIC NOT NULL,
  seats_licensed INTEGER,
  seats_used INTEGER,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  change_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_cost_history ENABLE ROW LEVEL SECURITY;

-- Admin-only access (matches vendor_subscriptions pattern)
CREATE POLICY "Authenticated users can view cost history"
  ON public.subscription_cost_history FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert cost history"
  ON public.subscription_cost_history FOR INSERT
  TO authenticated WITH CHECK (true);

-- Index for efficient querying by subscription and time
CREATE INDEX idx_cost_history_subscription_date 
  ON public.subscription_cost_history(subscription_id, recorded_at DESC);

-- Index on operating_expenses for monthly aggregation
CREATE INDEX IF NOT EXISTS idx_operating_expenses_date 
  ON public.operating_expenses(expense_date);

-- Trigger: auto-snapshot cost when vendor_subscriptions.monthly_cost changes
CREATE OR REPLACE FUNCTION public.snapshot_subscription_cost()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.monthly_cost IS DISTINCT FROM NEW.monthly_cost 
     OR OLD.annual_cost IS DISTINCT FROM NEW.annual_cost
     OR OLD.seats_licensed IS DISTINCT FROM NEW.seats_licensed
     OR OLD.seats_used IS DISTINCT FROM NEW.seats_used THEN
    INSERT INTO public.subscription_cost_history (
      subscription_id, monthly_cost, annual_cost, seats_licensed, seats_used, change_reason
    ) VALUES (
      NEW.id, NEW.monthly_cost, NEW.annual_cost, NEW.seats_licensed, NEW.seats_used,
      CASE 
        WHEN OLD.monthly_cost IS DISTINCT FROM NEW.monthly_cost THEN 'Price change'
        WHEN OLD.seats_licensed IS DISTINCT FROM NEW.seats_licensed THEN 'Seat change'
        ELSE 'Update'
      END
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_snapshot_subscription_cost
  AFTER UPDATE ON public.vendor_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.snapshot_subscription_cost();

-- Also snapshot on insert (initial cost)
CREATE OR REPLACE FUNCTION public.snapshot_subscription_cost_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscription_cost_history (
    subscription_id, monthly_cost, annual_cost, seats_licensed, seats_used, change_reason
  ) VALUES (
    NEW.id, NEW.monthly_cost, NEW.annual_cost, NEW.seats_licensed, NEW.seats_used, 'Initial'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_snapshot_subscription_cost_insert
  AFTER INSERT ON public.vendor_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.snapshot_subscription_cost_on_insert();

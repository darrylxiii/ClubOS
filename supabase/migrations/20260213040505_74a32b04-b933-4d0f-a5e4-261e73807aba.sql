
-- Add columns to sourcing_missions
ALTER TABLE public.sourcing_missions
  ADD COLUMN IF NOT EXISTS search_strategy JSONB,
  ADD COLUMN IF NOT EXISTS time_spent_minutes INT;

-- Add strategist RLS policy (currently only admin/super_admin)
CREATE POLICY "Strategists can view assigned sourcing missions"
  ON public.sourcing_missions FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'strategist'::app_role)
  );

CREATE POLICY "Strategists can create sourcing missions"
  ON public.sourcing_missions FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'strategist'::app_role)
  );

CREATE POLICY "Strategists can update sourcing missions"
  ON public.sourcing_missions FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'strategist'::app_role)
  );

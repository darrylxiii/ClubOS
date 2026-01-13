-- Add stage probability config for CRM prospects
CREATE TABLE IF NOT EXISTS public.crm_stage_probabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage TEXT NOT NULL UNIQUE,
  probability_weight INTEGER NOT NULL DEFAULT 10,
  stage_order INTEGER NOT NULL,
  is_terminal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default stage probabilities
INSERT INTO public.crm_stage_probabilities (stage, probability_weight, stage_order, is_terminal) VALUES
  ('new', 5, 1, false),
  ('replied', 15, 2, false),
  ('qualified', 30, 3, false),
  ('meeting_booked', 50, 4, false),
  ('proposal_sent', 65, 5, false),
  ('negotiation', 80, 6, false),
  ('closed_won', 100, 7, true),
  ('closed_lost', 0, 8, true)
ON CONFLICT (stage) DO NOTHING;

-- Add annual value estimation to prospects
ALTER TABLE public.crm_prospects
ADD COLUMN IF NOT EXISTS estimated_annual_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS annual_value_source TEXT DEFAULT 'manual';

-- Create function to calculate CRM weighted pipeline
CREATE OR REPLACE FUNCTION public.calculate_crm_weighted_pipeline()
RETURNS TABLE (
  total_pipeline NUMERIC,
  weighted_pipeline NUMERIC,
  prospect_count INTEGER,
  avg_deal_size NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(p.estimated_annual_value), 0)::NUMERIC as total_pipeline,
    COALESCE(SUM(p.estimated_annual_value * (sp.probability_weight::NUMERIC / 100)), 0)::NUMERIC as weighted_pipeline,
    COUNT(p.id)::INTEGER as prospect_count,
    CASE WHEN COUNT(p.id) > 0 
      THEN (COALESCE(SUM(p.estimated_annual_value), 0) / COUNT(p.id))::NUMERIC 
      ELSE 0 
    END as avg_deal_size
  FROM crm_prospects p
  LEFT JOIN crm_stage_probabilities sp ON p.stage = sp.stage
  WHERE p.stage NOT IN ('closed_won', 'closed_lost');
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.calculate_crm_weighted_pipeline() TO authenticated;

-- Enable RLS on stage probabilities
ALTER TABLE public.crm_stage_probabilities ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read stage probabilities
CREATE POLICY "Authenticated users can read stage probabilities"
  ON public.crm_stage_probabilities
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins to manage stage probabilities
CREATE POLICY "Admins can manage stage probabilities"
  ON public.crm_stage_probabilities
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );
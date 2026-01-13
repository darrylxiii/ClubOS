-- Phase 1: Deal Pipeline Foundation

-- Create deal_stages table with probability weights
CREATE TABLE IF NOT EXISTS public.deal_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  probability_weight DECIMAL(5,2) NOT NULL CHECK (probability_weight >= 0 AND probability_weight <= 100),
  is_terminal BOOLEAN DEFAULT false,
  stage_type TEXT NOT NULL CHECK (stage_type IN ('active', 'won', 'lost')),
  description TEXT,
  color TEXT DEFAULT '#6B7280',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(name),
  UNIQUE(stage_order)
);

-- Create deal_stage_history table for tracking transitions
CREATE TABLE IF NOT EXISTS public.deal_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT now(),
  changed_by UUID REFERENCES auth.users(id),
  duration_days INTEGER,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create deal_loss_reasons table
CREATE TABLE IF NOT EXISTS public.deal_loss_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  reason_category TEXT NOT NULL CHECK (reason_category IN (
    'budget_constraints',
    'timing_not_right',
    'competitor_won',
    'internal_hire',
    'role_cancelled',
    'poor_candidate_quality',
    'slow_response_time',
    'other'
  )),
  detailed_reason TEXT,
  competitor_name TEXT,
  lost_to_internal BOOLEAN DEFAULT false,
  could_revisit BOOLEAN DEFAULT false,
  revisit_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create financial_forecasts table
CREATE TABLE IF NOT EXISTS public.financial_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_month DATE NOT NULL,
  predicted_placement_revenue DECIMAL(12,2) DEFAULT 0,
  predicted_subscription_revenue DECIMAL(12,2) DEFAULT 0,
  confidence_level TEXT CHECK (confidence_level IN ('low', 'medium', 'high')),
  actual_revenue DECIMAL(12,2),
  variance_percentage DECIMAL(5,2),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(forecast_month)
);

-- Add deal-related columns to jobs table
ALTER TABLE public.jobs 
  ADD COLUMN IF NOT EXISTS deal_stage TEXT DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS deal_probability DECIMAL(5,2) DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS expected_close_date DATE,
  ADD COLUMN IF NOT EXISTS deal_value_override DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS deal_health_score INTEGER DEFAULT 50 CHECK (deal_health_score >= 0 AND deal_health_score <= 100),
  ADD COLUMN IF NOT EXISTS last_activity_date TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS is_lost BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS loss_reason_id UUID REFERENCES public.deal_loss_reasons(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_deal_stage ON public.jobs(deal_stage);
CREATE INDEX IF NOT EXISTS idx_jobs_expected_close_date ON public.jobs(expected_close_date);
CREATE INDEX IF NOT EXISTS idx_jobs_deal_health_score ON public.jobs(deal_health_score);
CREATE INDEX IF NOT EXISTS idx_jobs_is_lost ON public.jobs(is_lost);
CREATE INDEX IF NOT EXISTS idx_deal_stage_history_deal_id ON public.deal_stage_history(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_loss_reasons_deal_id ON public.deal_loss_reasons(deal_id);

-- Seed default deal stages
INSERT INTO public.deal_stages (name, stage_order, probability_weight, stage_type, description, color) VALUES
  ('New', 1, 10.00, 'active', 'Initial contact, requirements gathering', '#8B5CF6'),
  ('Qualified', 2, 25.00, 'active', 'Budget confirmed, decision makers identified', '#3B82F6'),
  ('Proposal', 3, 50.00, 'active', 'Proposal sent, candidates shortlisted', '#F59E0B'),
  ('Negotiation', 4, 75.00, 'active', 'Offers made, negotiations in progress', '#10B981'),
  ('Closed Won', 5, 100.00, 'won', 'Deal successfully closed, candidate hired', '#22C55E'),
  ('Closed Lost', 6, 0.00, 'lost', 'Deal lost or cancelled', '#EF4444')
ON CONFLICT (name) DO NOTHING;

-- Function to update deal stage and log history
CREATE OR REPLACE FUNCTION public.update_deal_stage()
RETURNS TRIGGER AS $$
DECLARE
  prev_stage TEXT;
  days_in_stage INTEGER;
BEGIN
  -- Get previous stage
  IF TG_OP = 'UPDATE' AND OLD.deal_stage IS DISTINCT FROM NEW.deal_stage THEN
    prev_stage := OLD.deal_stage;
    
    -- Calculate days in previous stage
    SELECT EXTRACT(DAY FROM (NOW() - OLD.updated_at))::INTEGER INTO days_in_stage;
    
    -- Insert stage history
    INSERT INTO public.deal_stage_history (
      deal_id,
      from_stage,
      to_stage,
      changed_by,
      duration_days
    ) VALUES (
      NEW.id,
      prev_stage,
      NEW.deal_stage,
      auth.uid(),
      days_in_stage
    );
    
    -- Update probability based on stage
    SELECT probability_weight INTO NEW.deal_probability
    FROM public.deal_stages
    WHERE name = NEW.deal_stage;
    
    -- Update last activity date
    NEW.last_activity_date := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for deal stage updates
DROP TRIGGER IF EXISTS trigger_update_deal_stage ON public.jobs;
CREATE TRIGGER trigger_update_deal_stage
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_deal_stage();

-- Function to calculate deal health score
CREATE OR REPLACE FUNCTION public.calculate_deal_health_score(job_id UUID)
RETURNS INTEGER AS $$
DECLARE
  health_score INTEGER := 0;
  candidate_score INTEGER := 0;
  engagement_score INTEGER := 0;
  time_score INTEGER := 0;
  progression_score INTEGER := 0;
  data_score INTEGER := 0;
  days_since_activity INTEGER;
  active_candidates INTEGER;
  recent_activities INTEGER;
BEGIN
  -- Candidate Activity (30 points)
  SELECT COUNT(*) INTO active_candidates
  FROM public.applications
  WHERE job_id = calculate_deal_health_score.job_id
    AND status NOT IN ('rejected', 'withdrawn');
  
  candidate_score := LEAST(30, active_candidates * 10);
  
  -- Engagement Velocity (25 points)
  SELECT COUNT(*) INTO recent_activities
  FROM public.candidate_interactions
  WHERE job_id = calculate_deal_health_score.job_id
    AND created_at > NOW() - INTERVAL '14 days';
  
  engagement_score := LEAST(25, recent_activities * 5);
  
  -- Time Decay (20 points)
  SELECT EXTRACT(DAY FROM (NOW() - last_activity_date))::INTEGER INTO days_since_activity
  FROM public.jobs
  WHERE id = calculate_deal_health_score.job_id;
  
  time_score := CASE
    WHEN days_since_activity <= 7 THEN 20
    WHEN days_since_activity <= 14 THEN 15
    WHEN days_since_activity <= 30 THEN 10
    ELSE 0
  END;
  
  -- Progression Speed (15 points) - simplified
  progression_score := 15;
  
  -- Data Completeness (10 points)
  SELECT 
    CASE WHEN expected_close_date IS NOT NULL THEN 5 ELSE 0 END +
    CASE WHEN deal_value_override IS NOT NULL THEN 5 ELSE 0 END
  INTO data_score
  FROM public.jobs
  WHERE id = calculate_deal_health_score.job_id;
  
  health_score := candidate_score + engagement_score + time_score + progression_score + data_score;
  
  RETURN LEAST(100, health_score);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate weighted pipeline value
CREATE OR REPLACE FUNCTION public.calculate_weighted_pipeline()
RETURNS TABLE(
  total_pipeline DECIMAL,
  weighted_pipeline DECIMAL,
  deal_count INTEGER,
  avg_deal_size DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN j.deal_value_override IS NOT NULL THEN j.deal_value_override
        ELSE COALESCE(pbd.default_fee_percentage / 100, 0.20) * 
             COALESCE(NULLIF(TRIM(cp.current_salary), '')::DECIMAL, 75000.00) *
             COUNT(DISTINCT a.id)
      END
    ), 0) as total_pipeline,
    COALESCE(SUM(
      (CASE 
        WHEN j.deal_value_override IS NOT NULL THEN j.deal_value_override
        ELSE COALESCE(pbd.default_fee_percentage / 100, 0.20) * 
             COALESCE(NULLIF(TRIM(cp.current_salary), '')::DECIMAL, 75000.00) *
             COUNT(DISTINCT a.id)
      END) * (j.deal_probability / 100)
    ), 0) as weighted_pipeline,
    COUNT(DISTINCT j.id)::INTEGER as deal_count,
    COALESCE(AVG(
      CASE 
        WHEN j.deal_value_override IS NOT NULL THEN j.deal_value_override
        ELSE COALESCE(pbd.default_fee_percentage / 100, 0.20) * 
             COALESCE(NULLIF(TRIM(cp.current_salary), '')::DECIMAL, 75000.00)
      END
    ), 0) as avg_deal_size
  FROM public.jobs j
  LEFT JOIN public.applications a ON a.job_id = j.id AND a.status NOT IN ('rejected', 'withdrawn')
  LEFT JOIN public.candidate_profiles cp ON cp.id = a.candidate_id
  LEFT JOIN public.partner_billing_details pbd ON pbd.company_id = j.company_id
  WHERE j.status = 'open'
    AND j.is_lost = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE public.deal_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_loss_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_forecasts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admin and strategists can view deal stages"
  ON public.deal_stages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admin can manage deal stages"
  ON public.deal_stages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admin and strategists can view deal history"
  ON public.deal_stage_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admin and strategists can view loss reasons"
  ON public.deal_loss_reasons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admin and strategists can manage loss reasons"
  ON public.deal_loss_reasons FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admin can view forecasts"
  ON public.financial_forecasts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admin can manage forecasts"
  ON public.financial_forecasts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );
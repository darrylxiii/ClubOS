-- Phase 1: Critical Infrastructure - Database Migrations

-- 1.1 Probation Period Monitoring
ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS probation_end_date DATE,
ADD COLUMN IF NOT EXISTS probation_status TEXT DEFAULT 'pending' CHECK (probation_status IN ('pending', 'active', 'passed', 'failed', 'extended'));

-- Create probation alerts table
CREATE TABLE IF NOT EXISTS public.probation_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('30_days', '14_days', '7_days', 'ending_today', 'expired', 'check_in')),
  alert_date DATE NOT NULL,
  is_acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on probation_alerts
ALTER TABLE public.probation_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and strategists can view probation alerts"
ON public.probation_alerts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'strategist')
  )
);

CREATE POLICY "Admins and strategists can manage probation alerts"
ON public.probation_alerts FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'strategist')
  )
);

-- Trigger to auto-set probation_end_date when hired
CREATE OR REPLACE FUNCTION public.set_probation_end_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'hired' AND OLD.status != 'hired' THEN
    NEW.probation_end_date := CURRENT_DATE + INTERVAL '90 days';
    NEW.probation_status := 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_probation_end_date ON public.applications;
CREATE TRIGGER trg_set_probation_end_date
BEFORE UPDATE ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.set_probation_end_date();

-- Function to generate probation alerts
CREATE OR REPLACE FUNCTION public.generate_probation_alerts()
RETURNS void AS $$
DECLARE
  app RECORD;
BEGIN
  FOR app IN 
    SELECT a.id, a.candidate_id, a.job_id, j.company_id, a.probation_end_date
    FROM public.applications a
    LEFT JOIN public.jobs j ON a.job_id = j.id
    WHERE a.status = 'hired' 
    AND a.probation_status = 'active'
    AND a.probation_end_date IS NOT NULL
  LOOP
    -- 30 days alert
    IF app.probation_end_date = CURRENT_DATE + INTERVAL '30 days' THEN
      INSERT INTO public.probation_alerts (application_id, candidate_id, job_id, company_id, alert_type, alert_date)
      VALUES (app.id, app.candidate_id, app.job_id, app.company_id, '30_days', CURRENT_DATE)
      ON CONFLICT DO NOTHING;
    END IF;
    
    -- 14 days alert
    IF app.probation_end_date = CURRENT_DATE + INTERVAL '14 days' THEN
      INSERT INTO public.probation_alerts (application_id, candidate_id, job_id, company_id, alert_type, alert_date)
      VALUES (app.id, app.candidate_id, app.job_id, app.company_id, '14_days', CURRENT_DATE)
      ON CONFLICT DO NOTHING;
    END IF;
    
    -- 7 days alert
    IF app.probation_end_date = CURRENT_DATE + INTERVAL '7 days' THEN
      INSERT INTO public.probation_alerts (application_id, candidate_id, job_id, company_id, alert_type, alert_date)
      VALUES (app.id, app.candidate_id, app.job_id, app.company_id, '7_days', CURRENT_DATE)
      ON CONFLICT DO NOTHING;
    END IF;
    
    -- Ending today alert
    IF app.probation_end_date = CURRENT_DATE THEN
      INSERT INTO public.probation_alerts (application_id, candidate_id, job_id, company_id, alert_type, alert_date)
      VALUES (app.id, app.candidate_id, app.job_id, app.company_id, 'ending_today', CURRENT_DATE)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1.2 Offer Letter Templates
CREATE TABLE IF NOT EXISTS public.offer_letter_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template_content TEXT NOT NULL,
  template_variables JSONB DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.offer_letter_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and strategists can view offer templates"
ON public.offer_letter_templates FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'strategist')
  )
);

CREATE POLICY "Admins can manage offer templates"
ON public.offer_letter_templates FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Add generated_letter_url to candidate_offers if not exists
ALTER TABLE public.candidate_offers 
ADD COLUMN IF NOT EXISTS generated_letter_url TEXT,
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.offer_letter_templates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS letter_generated_at TIMESTAMPTZ;

-- Phase 2: Strategist Performance Snapshots
CREATE TABLE IF NOT EXISTS public.strategist_performance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategist_id UUID NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly')),
  placements_count INTEGER DEFAULT 0,
  revenue_generated NUMERIC(15,2) DEFAULT 0,
  deals_closed INTEGER DEFAULT 0,
  deals_in_pipeline INTEGER DEFAULT 0,
  avg_time_to_fill INTEGER DEFAULT 0,
  conversion_rate NUMERIC(5,2) DEFAULT 0,
  candidate_nps_avg NUMERIC(3,1),
  applications_sourced INTEGER DEFAULT 0,
  interviews_scheduled INTEGER DEFAULT 0,
  offers_extended INTEGER DEFAULT 0,
  offers_accepted INTEGER DEFAULT 0,
  ranking_score NUMERIC(10,2) DEFAULT 0,
  rank_position INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(strategist_id, snapshot_date, period_type)
);

ALTER TABLE public.strategist_performance_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all strategist snapshots"
ON public.strategist_performance_snapshots FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Strategists can view own snapshots"
ON public.strategist_performance_snapshots FOR SELECT
TO authenticated
USING (strategist_id = auth.uid());

-- Function to calculate strategist ranking score
CREATE OR REPLACE FUNCTION public.calculate_strategist_ranking_score(
  p_revenue NUMERIC,
  p_placements INTEGER,
  p_conversion_rate NUMERIC,
  p_avg_time_to_fill INTEGER,
  p_candidate_nps NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
  v_revenue_normalized NUMERIC;
  v_speed_bonus NUMERIC;
BEGIN
  -- Normalize revenue (assume 100k = 100 points)
  v_revenue_normalized := COALESCE(p_revenue, 0) / 1000;
  
  -- Speed bonus: faster fills = higher bonus (inverse of days)
  v_speed_bonus := CASE 
    WHEN COALESCE(p_avg_time_to_fill, 0) > 0 THEN 100 / p_avg_time_to_fill
    ELSE 0
  END;
  
  -- Score = (Revenue × 0.3) + (Placements × 10 × 0.25) + (ConversionRate × 0.2) + (SpeedBonus × 0.15) + (NPS × 10 × 0.1)
  RETURN (
    v_revenue_normalized * 0.3 +
    COALESCE(p_placements, 0) * 10 * 0.25 +
    COALESCE(p_conversion_rate, 0) * 0.2 +
    v_speed_bonus * 0.15 +
    COALESCE(p_candidate_nps, 0) * 10 * 0.1
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Phase 3: Add auto_reengagement to candidate_profiles
ALTER TABLE public.candidate_profiles 
ADD COLUMN IF NOT EXISTS auto_reengagement_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS last_reengagement_at TIMESTAMPTZ;

-- Create reengagement campaign table if not exists
CREATE TABLE IF NOT EXISTS public.reengagement_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('new_opportunities', 'still_looking', 'industry_insights', 'passive_nurture')),
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  triggered_by TEXT DEFAULT 'system',
  email_sent_at TIMESTAMPTZ,
  email_opened_at TIMESTAMPTZ,
  email_clicked_at TIMESTAMPTZ,
  response_received_at TIMESTAMPTZ,
  reactivated BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reengagement_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and strategists can view reengagement campaigns"
ON public.reengagement_campaigns FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'strategist')
  )
);

CREATE POLICY "System can manage reengagement campaigns"
ON public.reengagement_campaigns FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'strategist')
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_probation_alerts_application ON public.probation_alerts(application_id);
CREATE INDEX IF NOT EXISTS idx_probation_alerts_date ON public.probation_alerts(alert_date);
CREATE INDEX IF NOT EXISTS idx_applications_probation ON public.applications(probation_end_date) WHERE status = 'hired';
CREATE INDEX IF NOT EXISTS idx_strategist_snapshots_date ON public.strategist_performance_snapshots(snapshot_date, period_type);
CREATE INDEX IF NOT EXISTS idx_reengagement_campaigns_candidate ON public.reengagement_campaigns(candidate_id);

-- Insert default offer letter template
INSERT INTO public.offer_letter_templates (name, description, template_content, template_variables, is_default)
VALUES (
  'Standard Offer Letter',
  'Default professional offer letter template',
  E'Dear {{candidate_name}},\n\nWe are pleased to offer you the position of {{job_title}} at {{company_name}}.\n\nStart Date: {{start_date}}\nBase Salary: €{{base_salary}} per year\nBonus: {{bonus}}\n\nBenefits:\n{{benefits}}\n\nProbation Period: {{probation_period}} days\n\nPlease sign and return this offer by {{expiry_date}}.\n\nWelcome to the team!\n\nBest regards,\n{{signatory_name}}\n{{signatory_title}}',
  '["candidate_name", "job_title", "company_name", "start_date", "base_salary", "bonus", "benefits", "probation_period", "expiry_date", "signatory_name", "signatory_title"]'::jsonb,
  true
) ON CONFLICT DO NOTHING;
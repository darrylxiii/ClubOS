-- =====================================================
-- Employee Gamification & Pipeline Value Tracking
-- =====================================================

-- 1. Employee Gamification Table (XP, Levels, Streaks)
CREATE TABLE IF NOT EXISTS public.employee_gamification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  current_level TEXT NOT NULL DEFAULT 'Scout',
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT employee_gamification_user_unique UNIQUE (user_id)
);

-- 2. Employee Milestones Table
CREATE TABLE IF NOT EXISTS public.employee_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL,
  milestone_value NUMERIC,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT employee_milestones_unique UNIQUE (user_id, milestone_type)
);

-- 3. Employee XP Events Table (for tracking XP gains)
CREATE TABLE IF NOT EXISTS public.employee_xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  xp_amount INTEGER NOT NULL,
  description TEXT,
  related_entity_type TEXT,
  related_entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create view for employee pipeline value calculations
-- Uses sourced_by from applications + sourcing_credits for attribution
-- Fee comes from job or company settings
CREATE OR REPLACE VIEW public.employee_pipeline_value AS
WITH employee_applications AS (
  SELECT 
    COALESCE(sc.user_id, a.sourced_by) AS employee_id,
    a.id AS application_id,
    a.candidate_id,
    a.job_id,
    j.company_id,
    a.status,
    a.current_stage_index AS stage,
    a.created_at AS application_date,
    j.title AS job_title,
    c.name AS company_name,
    a.candidate_full_name,
    -- Calculate potential fee: job fee > company fee > default 15000
    COALESCE(
      NULLIF(j.job_fee_fixed, 0),
      CASE WHEN COALESCE(j.job_fee_percentage, 0) > 0 
           THEN (j.job_fee_percentage / 100.0) * COALESCE(j.salary_min, 75000) 
           END,
      NULLIF(c.placement_fee_fixed, 0),
      CASE WHEN COALESCE(c.placement_fee_percentage, 0) > 0 
           THEN (c.placement_fee_percentage / 100.0) * COALESCE(j.salary_min, 75000) 
           END,
      15000
    ) AS potential_fee
  FROM public.applications a
  LEFT JOIN public.sourcing_credits sc ON sc.application_id = a.id
  LEFT JOIN public.jobs j ON j.id = a.job_id
  LEFT JOIN public.companies c ON c.id = j.company_id
  WHERE a.status NOT IN ('rejected', 'withdrawn')
    AND (sc.user_id IS NOT NULL OR a.sourced_by IS NOT NULL)
),
stage_probabilities AS (
  SELECT 0 AS stage, 0.10 AS probability, 'Applied' AS stage_name
  UNION ALL SELECT 1, 0.25, 'Screening'
  UNION ALL SELECT 2, 0.50, 'Interview'
  UNION ALL SELECT 3, 0.80, 'Offer'
  UNION ALL SELECT 4, 1.00, 'Hired'
)
SELECT 
  ea.employee_id,
  ea.application_id,
  ea.candidate_id,
  ea.job_id,
  ea.company_id,
  ea.status,
  ea.stage,
  COALESCE(sp.stage_name, 'Applied') AS stage_name,
  ea.application_date,
  ea.job_title,
  ea.company_name,
  ea.candidate_full_name,
  ea.potential_fee,
  COALESCE(sp.probability, 0.10) AS probability,
  (ea.potential_fee * COALESCE(sp.probability, 0.10)) AS weighted_value
FROM employee_applications ea
LEFT JOIN stage_probabilities sp ON sp.stage = ea.stage
WHERE ea.employee_id IS NOT NULL;

-- 5. Create aggregated employee earnings summary view
CREATE OR REPLACE VIEW public.employee_earnings_summary AS
SELECT 
  employee_id,
  COUNT(DISTINCT application_id) AS total_applications,
  COUNT(DISTINCT CASE WHEN status = 'hired' THEN application_id END) AS total_placements,
  COALESCE(SUM(potential_fee), 0) AS raw_pipeline_value,
  COALESCE(SUM(weighted_value), 0) AS weighted_pipeline_value,
  COALESCE(SUM(CASE WHEN status = 'hired' THEN potential_fee ELSE 0 END), 0) AS realized_revenue,
  COUNT(CASE WHEN stage = 0 THEN 1 END) AS stage_0_count,
  COUNT(CASE WHEN stage = 1 THEN 1 END) AS stage_1_count,
  COUNT(CASE WHEN stage = 2 THEN 1 END) AS stage_2_count,
  COUNT(CASE WHEN stage = 3 THEN 1 END) AS stage_3_count,
  COUNT(CASE WHEN stage >= 4 OR status = 'hired' THEN 1 END) AS stage_4_count,
  COALESCE(SUM(CASE WHEN stage = 0 THEN weighted_value ELSE 0 END), 0) AS stage_0_value,
  COALESCE(SUM(CASE WHEN stage = 1 THEN weighted_value ELSE 0 END), 0) AS stage_1_value,
  COALESCE(SUM(CASE WHEN stage = 2 THEN weighted_value ELSE 0 END), 0) AS stage_2_value,
  COALESCE(SUM(CASE WHEN stage = 3 THEN weighted_value ELSE 0 END), 0) AS stage_3_value,
  COALESCE(SUM(CASE WHEN stage >= 4 OR status = 'hired' THEN weighted_value ELSE 0 END), 0) AS stage_4_value
FROM public.employee_pipeline_value
GROUP BY employee_id;

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_employee_gamification_user ON public.employee_gamification(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_milestones_user ON public.employee_milestones(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_xp_events_user ON public.employee_xp_events(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_xp_events_created ON public.employee_xp_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_sourced_by ON public.applications(sourced_by);

-- 7. RLS Policies
ALTER TABLE public.employee_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_xp_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gamification" ON public.employee_gamification
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all gamification" ON public.employee_gamification
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can view own milestones" ON public.employee_milestones
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all milestones" ON public.employee_milestones
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can view own xp events" ON public.employee_xp_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage gamification" ON public.employee_gamification
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage milestones" ON public.employee_milestones
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage xp events" ON public.employee_xp_events
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 8. Function to calculate employee level from XP
CREATE OR REPLACE FUNCTION public.calculate_employee_level(xp INTEGER)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE 
    WHEN xp >= 15000 THEN 'Legend'
    WHEN xp >= 5000 THEN 'Elite'
    WHEN xp >= 2000 THEN 'Strategist'
    WHEN xp >= 500 THEN 'Closer'
    ELSE 'Scout'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 9. Trigger to update employee level when XP changes
CREATE OR REPLACE FUNCTION public.update_employee_level()
RETURNS TRIGGER AS $$
BEGIN
  NEW.current_level := public.calculate_employee_level(NEW.total_xp);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_employee_level ON public.employee_gamification;
CREATE TRIGGER trg_update_employee_level
  BEFORE UPDATE OF total_xp ON public.employee_gamification
  FOR EACH ROW
  EXECUTE FUNCTION public.update_employee_level();
-- =============================================
-- QUANTUM PERFORMANCE MATRIX 360 - DATABASE SCHEMA
-- =============================================

-- Time tracking entries (Hubstaff equivalent)
CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hours_worked NUMERIC(5,2) NOT NULL DEFAULT 0,
  billable_hours NUMERIC(5,2) DEFAULT 0,
  idle_time_minutes INTEGER DEFAULT 0,
  activity_level TEXT CHECK (activity_level IN ('low', 'medium', 'high')),
  source TEXT DEFAULT 'manual',
  project_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- NPS Surveys (Candidate & Client)
CREATE TABLE IF NOT EXISTS public.nps_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_type TEXT NOT NULL CHECK (survey_type IN ('candidate', 'client')),
  respondent_id UUID NOT NULL,
  respondent_type TEXT NOT NULL CHECK (respondent_type IN ('candidate', 'partner')),
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  nps_score INTEGER CHECK (nps_score BETWEEN 0 AND 10),
  stage_name TEXT,
  feedback_text TEXT,
  response_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CSAT Per Stage Surveys
CREATE TABLE IF NOT EXISTS public.csat_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  respondent_id UUID NOT NULL,
  respondent_type TEXT NOT NULL CHECK (respondent_type IN ('candidate', 'partner')),
  milestone TEXT NOT NULL CHECK (milestone IN ('application', 'screening', 'interview', 'offer', 'hire', 'placement')),
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  score INTEGER CHECK (score BETWEEN 1 AND 5),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recruiter Bonus Tracking
CREATE TABLE IF NOT EXISTS public.recruiter_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  bonus_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  bonus_type TEXT CHECK (bonus_type IN ('placement', 'performance', 'quarterly', 'annual', 'other')),
  revenue_contribution NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Capacity Planning
CREATE TABLE IF NOT EXISTS public.capacity_planning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  scheduled_hours NUMERIC(5,2) DEFAULT 40,
  available_hours NUMERIC(5,2) DEFAULT 40,
  forecast_load NUMERIC(5,2) DEFAULT 0,
  capacity_load_percent NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- Unified KPI Metrics Storage
CREATE TABLE IF NOT EXISTS public.kpi_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('workforce', 'pipeline', 'recruitment', 'experience', 'utilisation', 'financial')),
  kpi_name TEXT NOT NULL,
  value NUMERIC(12,4) DEFAULT 0,
  previous_value NUMERIC(12,4),
  trend_direction TEXT CHECK (trend_direction IN ('up', 'down', 'stable')),
  trend_percent NUMERIC(8,2),
  period_type TEXT DEFAULT 'weekly' CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_entries_user_date ON time_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_nps_surveys_type_date ON nps_surveys(survey_type, response_date);
CREATE INDEX IF NOT EXISTS idx_csat_surveys_milestone ON csat_surveys(milestone, created_at);
CREATE INDEX IF NOT EXISTS idx_kpi_metrics_category_period ON kpi_metrics(category, period_start);
CREATE INDEX IF NOT EXISTS idx_capacity_planning_user_week ON capacity_planning(user_id, week_start);

-- Enable RLS
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE nps_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE csat_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruiter_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacity_planning ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for time_entries
CREATE POLICY "Users can view own time entries" ON time_entries
  FOR SELECT USING (auth.uid() = user_id OR user_has_role(auth.uid(), 'admin') OR user_has_role(auth.uid(), 'strategist'));

CREATE POLICY "Users can insert own time entries" ON time_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own time entries" ON time_entries
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for surveys (admins/strategists can view all)
CREATE POLICY "Admins can view all NPS surveys" ON nps_surveys
  FOR SELECT USING (user_has_role(auth.uid(), 'admin') OR user_has_role(auth.uid(), 'strategist'));

CREATE POLICY "Users can insert NPS surveys" ON nps_surveys
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all CSAT surveys" ON csat_surveys
  FOR SELECT USING (user_has_role(auth.uid(), 'admin') OR user_has_role(auth.uid(), 'strategist'));

CREATE POLICY "Users can insert CSAT surveys" ON csat_surveys
  FOR INSERT WITH CHECK (true);

-- RLS Policies for bonuses (admin only)
CREATE POLICY "Admins can manage bonuses" ON recruiter_bonuses
  FOR ALL USING (user_has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own bonuses" ON recruiter_bonuses
  FOR SELECT USING (auth.uid() = recruiter_id);

-- RLS Policies for capacity
CREATE POLICY "Users can view own capacity" ON capacity_planning
  FOR SELECT USING (auth.uid() = user_id OR user_has_role(auth.uid(), 'admin') OR user_has_role(auth.uid(), 'strategist'));

CREATE POLICY "Users can manage own capacity" ON capacity_planning
  FOR ALL USING (auth.uid() = user_id OR user_has_role(auth.uid(), 'admin'));

-- RLS Policies for KPI metrics
CREATE POLICY "Admins and strategists can view all KPIs" ON kpi_metrics
  FOR SELECT USING (user_has_role(auth.uid(), 'admin') OR user_has_role(auth.uid(), 'strategist'));

CREATE POLICY "System can insert KPIs" ON kpi_metrics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update KPIs" ON kpi_metrics
  FOR UPDATE USING (user_has_role(auth.uid(), 'admin'));
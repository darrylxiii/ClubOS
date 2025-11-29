-- Create partner_analytics_snapshots table for enhanced analytics
CREATE TABLE IF NOT EXISTS partner_analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  total_applications INTEGER DEFAULT 0,
  active_candidates INTEGER DEFAULT 0,
  interviews_scheduled INTEGER DEFAULT 0,
  offers_sent INTEGER DEFAULT 0,
  hires_made INTEGER DEFAULT 0,
  avg_time_to_hire_days NUMERIC,
  offer_acceptance_rate NUMERIC,
  pipeline_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, snapshot_date)
);

-- Enable RLS
ALTER TABLE partner_analytics_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Partners see own snapshots"
  ON partner_analytics_snapshots FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can insert snapshots"
  ON partner_analytics_snapshots FOR INSERT
  WITH CHECK (true);

-- Create talent_matches table for recommendations
CREATE TABLE IF NOT EXISTS talent_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  match_score NUMERIC(3,2) CHECK (match_score >= 0 AND match_score <= 1),
  match_factors JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'contacted', 'shortlisted', 'rejected', 'hired')),
  recommended_at TIMESTAMPTZ DEFAULT now(),
  viewed_at TIMESTAMPTZ,
  contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE talent_matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Partners see matches for their company"
  ON talent_matches FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Partners can update match status"
  ON talent_matches FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Create company_strategist_assignments table
CREATE TABLE IF NOT EXISTS company_strategist_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  strategist_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by UUID REFERENCES profiles(id),
  sla_config JSONB DEFAULT '{
    "response_time_hours": 24,
    "shortlist_delivery_hours": 48,
    "interview_scheduling_hours": 72,
    "offer_turnaround_days": 5
  }'::jsonb,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE company_strategist_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Partners see their strategist assignment"
  ON company_strategist_assignments FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Strategists see their assignments"
  ON company_strategist_assignments FOR SELECT
  USING (strategist_id = auth.uid());

CREATE POLICY "Admins manage all assignments"
  ON company_strategist_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create sla_tracking table
CREATE TABLE IF NOT EXISTS sla_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_id UUID,
  sla_deadline TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  is_breach BOOLEAN DEFAULT false,
  breach_duration_hours NUMERIC,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE sla_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Partners see their SLA tracking"
  ON sla_tracking FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_partner_analytics_snapshots_company_date ON partner_analytics_snapshots(company_id, snapshot_date DESC);
CREATE INDEX idx_talent_matches_company_job ON talent_matches(company_id, job_id, match_score DESC);
CREATE INDEX idx_talent_matches_status ON talent_matches(status, recommended_at DESC);
CREATE INDEX idx_company_strategist_company ON company_strategist_assignments(company_id) WHERE is_active = true;
CREATE INDEX idx_sla_tracking_company_deadline ON sla_tracking(company_id, sla_deadline) WHERE completed_at IS NULL;

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE partner_analytics_snapshots;
ALTER PUBLICATION supabase_realtime ADD TABLE talent_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE sla_tracking;

-- Function to generate daily analytics snapshot
CREATE OR REPLACE FUNCTION generate_daily_analytics_snapshot(p_company_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_apps INTEGER;
  v_active_candidates INTEGER;
  v_interviews INTEGER;
  v_offers INTEGER;
  v_hires INTEGER;
  v_avg_time_to_hire NUMERIC;
  v_acceptance_rate NUMERIC;
BEGIN
  -- Get job IDs for company
  WITH company_jobs AS (
    SELECT id FROM jobs WHERE company_id = p_company_id AND status = 'published'
  )
  SELECT 
    COUNT(DISTINCT a.id),
    COUNT(DISTINCT CASE WHEN a.status IN ('screening', 'interviewing', 'offered') THEN a.id END),
    COUNT(DISTINCT CASE WHEN a.status = 'interviewing' THEN a.id END),
    COUNT(DISTINCT CASE WHEN a.status = 'offered' THEN a.id END),
    COUNT(DISTINCT CASE WHEN a.status = 'hired' THEN a.id END),
    AVG(CASE WHEN a.status = 'hired' 
      THEN EXTRACT(EPOCH FROM (a.updated_at - a.applied_at))/86400 
      ELSE NULL END),
    CASE 
      WHEN COUNT(DISTINCT CASE WHEN a.status IN ('offered', 'hired') THEN a.id END) > 0
      THEN (COUNT(DISTINCT CASE WHEN a.status = 'hired' THEN a.id END)::NUMERIC / 
            COUNT(DISTINCT CASE WHEN a.status IN ('offered', 'hired') THEN a.id END)::NUMERIC) * 100
      ELSE 0
    END
  INTO v_total_apps, v_active_candidates, v_interviews, v_offers, v_hires, v_avg_time_to_hire, v_acceptance_rate
  FROM applications a
  WHERE a.job_id IN (SELECT id FROM company_jobs);

  -- Insert or update snapshot
  INSERT INTO partner_analytics_snapshots (
    company_id,
    snapshot_date,
    total_applications,
    active_candidates,
    interviews_scheduled,
    offers_sent,
    hires_made,
    avg_time_to_hire_days,
    offer_acceptance_rate
  ) VALUES (
    p_company_id,
    CURRENT_DATE,
    COALESCE(v_total_apps, 0),
    COALESCE(v_active_candidates, 0),
    COALESCE(v_interviews, 0),
    COALESCE(v_offers, 0),
    COALESCE(v_hires, 0),
    v_avg_time_to_hire,
    v_acceptance_rate
  )
  ON CONFLICT (company_id, snapshot_date)
  DO UPDATE SET
    total_applications = EXCLUDED.total_applications,
    active_candidates = EXCLUDED.active_candidates,
    interviews_scheduled = EXCLUDED.interviews_scheduled,
    offers_sent = EXCLUDED.offers_sent,
    hires_made = EXCLUDED.hires_made,
    avg_time_to_hire_days = EXCLUDED.avg_time_to_hire_days,
    offer_acceptance_rate = EXCLUDED.offer_acceptance_rate;
END;
$$;

-- Function to generate talent matches for a job
CREATE OR REPLACE FUNCTION generate_talent_matches(p_job_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_job_skills TEXT[];
  v_job_title TEXT;
BEGIN
  -- Get job details
  SELECT company_id, title, required_skills 
  INTO v_company_id, v_job_title, v_job_skills
  FROM jobs WHERE id = p_job_id;

  IF v_company_id IS NULL THEN
    RETURN;
  END IF;

  -- Simple matching based on skills overlap
  INSERT INTO talent_matches (company_id, job_id, candidate_id, match_score, match_factors)
  SELECT 
    v_company_id,
    p_job_id,
    cp.id,
    -- Simple score: percentage of required skills the candidate has
    CASE 
      WHEN v_job_skills IS NULL OR array_length(v_job_skills, 1) = 0 THEN 0.5
      ELSE LEAST(1.0, (
        SELECT COUNT(*)::NUMERIC / GREATEST(array_length(v_job_skills, 1), 1)::NUMERIC
        FROM unnest(v_job_skills) AS required_skill
        WHERE required_skill = ANY(cp.skills)
      ))
    END AS match_score,
    jsonb_build_object(
      'skills_match', (
        SELECT array_agg(skill)
        FROM unnest(v_job_skills) AS skill
        WHERE skill = ANY(cp.skills)
      ),
      'experience_years', cp.years_of_experience,
      'current_role', cp.title
    ) AS match_factors
  FROM candidate_profiles cp
  WHERE cp.is_active = true
    AND cp.is_searchable = true
    AND NOT EXISTS (
      SELECT 1 FROM applications 
      WHERE job_id = p_job_id AND candidate_id = cp.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM talent_matches
      WHERE job_id = p_job_id AND candidate_id = cp.id
    )
  ORDER BY match_score DESC
  LIMIT p_limit;
END;
$$;
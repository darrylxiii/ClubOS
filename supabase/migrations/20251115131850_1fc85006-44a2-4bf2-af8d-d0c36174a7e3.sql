-- Create job_team_assignments table for job-specific team roles
CREATE TABLE job_team_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  company_member_id UUID NOT NULL REFERENCES company_members(id) ON DELETE CASCADE,
  job_role TEXT NOT NULL CHECK (job_role IN ('hiring_manager', 'founder_reviewer', 'technical_interviewer', 'behavioral_interviewer', 'panel_member', 'observer', 'coordinator')),
  can_view_candidates BOOLEAN DEFAULT true,
  can_schedule_interviews BOOLEAN DEFAULT false,
  can_advance_candidates BOOLEAN DEFAULT false,
  can_decline_candidates BOOLEAN DEFAULT false,
  can_make_offers BOOLEAN DEFAULT false,
  interview_stages INTEGER[],
  is_primary_contact BOOLEAN DEFAULT false,
  notification_preferences JSONB DEFAULT '{"stage_changes":true,"new_applications":false,"interview_scheduled":true,"feedback_requested":true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, company_member_id)
);

CREATE INDEX idx_job_team_job ON job_team_assignments(job_id);
CREATE INDEX idx_job_team_member ON job_team_assignments(company_member_id);
CREATE INDEX idx_job_team_role ON job_team_assignments(job_role);

-- Enable RLS
ALTER TABLE job_team_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for job_team_assignments
CREATE POLICY "Users can view job team assignments for their company jobs"
  ON job_team_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM company_members cm
      JOIN jobs j ON j.company_id = cm.company_id
      WHERE cm.user_id = auth.uid()
      AND j.id = job_team_assignments.job_id
    )
  );

CREATE POLICY "Admins and hiring managers can manage job team assignments"
  ON job_team_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM company_members cm
      WHERE cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'admin')
      AND EXISTS (
        SELECT 1 FROM jobs j
        WHERE j.id = job_team_assignments.job_id
        AND j.company_id = cm.company_id
      )
    )
  );

-- Extend bookings table with interview-related fields
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS interview_stage_index INTEGER,
ADD COLUMN IF NOT EXISTS interview_type TEXT CHECK (interview_type IN ('screening','technical','behavioral','culture_fit','panel','founder','final','other')),
ADD COLUMN IF NOT EXISTS interviewer_ids UUID[],
ADD COLUMN IF NOT EXISTS interview_prep_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS feedback_submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_interview_booking BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_bookings_application ON bookings(application_id);
CREATE INDEX IF NOT EXISTS idx_bookings_job ON bookings(job_id);
CREATE INDEX IF NOT EXISTS idx_bookings_candidate ON bookings(candidate_id);
CREATE INDEX IF NOT EXISTS idx_bookings_interview_stage ON bookings(interview_stage_index) WHERE is_interview_booking = true;

-- Create interview_feedback table
CREATE TABLE interview_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  interviewer_id UUID NOT NULL REFERENCES company_members(id) ON DELETE CASCADE,
  interview_stage_index INTEGER NOT NULL,
  
  -- Structured ratings
  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
  technical_score INTEGER CHECK (technical_score BETWEEN 1 AND 10),
  communication_score INTEGER CHECK (communication_score BETWEEN 1 AND 10),
  culture_fit_score INTEGER CHECK (culture_fit_score BETWEEN 1 AND 10),
  
  -- Recommendation
  recommendation TEXT NOT NULL CHECK (recommendation IN ('strong_yes','yes','maybe','no','strong_no')),
  
  -- Qualitative
  strengths TEXT[],
  concerns TEXT[],
  detailed_notes TEXT,
  questions_asked JSONB,
  
  -- Decision factors
  key_observations TEXT[],
  red_flags TEXT[],
  standout_moments TEXT[],
  
  -- Metadata
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_final BOOLEAN DEFAULT true,
  
  UNIQUE(booking_id, interviewer_id)
);

CREATE INDEX idx_feedback_application ON interview_feedback(application_id);
CREATE INDEX idx_feedback_booking ON interview_feedback(booking_id);
CREATE INDEX idx_feedback_interviewer ON interview_feedback(interviewer_id);
CREATE INDEX idx_feedback_recommendation ON interview_feedback(recommendation);

-- Enable RLS
ALTER TABLE interview_feedback ENABLE ROW LEVEL SECURITY;

-- RLS policies for interview_feedback
CREATE POLICY "Team members can view interview feedback for their jobs"
  ON interview_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      JOIN jobs j ON j.id = a.job_id
      JOIN company_members cm ON cm.company_id = j.company_id
      WHERE cm.user_id = auth.uid()
      AND a.id = interview_feedback.application_id
    )
  );

CREATE POLICY "Interviewers can insert and update their own feedback"
  ON interview_feedback FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM company_members cm
      WHERE cm.user_id = auth.uid()
      AND cm.id = interview_feedback.interviewer_id
    )
  );

-- Create interview_stage_templates table
CREATE TABLE interview_stage_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  
  -- Meeting defaults
  default_duration_minutes INTEGER DEFAULT 60,
  default_title_template TEXT,
  default_description_template TEXT,
  
  -- Interview configuration
  interview_type TEXT,
  required_interviewer_roles TEXT[],
  optional_interviewer_roles TEXT[],
  min_interviewers INTEGER DEFAULT 1,
  max_interviewers INTEGER,
  
  -- Automation flags
  auto_schedule_enabled BOOLEAN DEFAULT false,
  send_prep_materials BOOLEAN DEFAULT true,
  require_feedback BOOLEAN DEFAULT true,
  feedback_deadline_hours INTEGER DEFAULT 24,
  
  -- Resources
  prep_materials_urls TEXT[],
  interview_guide_url TEXT,
  evaluation_criteria JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stage_templates_company ON interview_stage_templates(company_id);

-- Enable RLS
ALTER TABLE interview_stage_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for interview_stage_templates
CREATE POLICY "Users can view interview stage templates for their company"
  ON interview_stage_templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM company_members cm
      WHERE cm.user_id = auth.uid()
      AND cm.company_id = interview_stage_templates.company_id
    )
  );

CREATE POLICY "Admins can manage interview stage templates"
  ON interview_stage_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM company_members cm
      WHERE cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'admin')
      AND cm.company_id = interview_stage_templates.company_id
    )
  );
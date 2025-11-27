-- Part 4: Database Schema Enhancements for Meeting Intelligence

-- Add recruitment context columns to meetings table
ALTER TABLE meetings 
ADD COLUMN IF NOT EXISTS candidate_id UUID REFERENCES candidate_profiles(id),
ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id),
ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES applications(id),
ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id),
ADD COLUMN IF NOT EXISTS interview_stage TEXT,
ADD COLUMN IF NOT EXISTS meeting_type TEXT DEFAULT 'general';

CREATE INDEX IF NOT EXISTS idx_meetings_candidate_id ON meetings(candidate_id);
CREATE INDEX IF NOT EXISTS idx_meetings_job_id ON meetings(job_id);
CREATE INDEX IF NOT EXISTS idx_meetings_application_id ON meetings(application_id);

-- Create interview_question_patterns table
CREATE TABLE IF NOT EXISTS interview_question_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  interviewer_name TEXT,
  question_text TEXT NOT NULL,
  question_category TEXT,
  frequency INT DEFAULT 1,
  good_answer_examples JSONB DEFAULT '[]'::jsonb,
  bad_answer_examples JSONB DEFAULT '[]'::jsonb,
  extracted_from_meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interview_questions_company ON interview_question_patterns(company_id);
CREATE INDEX IF NOT EXISTS idx_interview_questions_category ON interview_question_patterns(question_category);
CREATE INDEX IF NOT EXISTS idx_interview_questions_embedding ON interview_question_patterns USING ivfflat (embedding vector_cosine_ops);

-- Create hiring_manager_profiles table
CREATE TABLE IF NOT EXISTS hiring_manager_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  interview_style TEXT,
  common_questions JSONB DEFAULT '[]'::jsonb,
  decision_patterns JSONB DEFAULT '[]'::jsonb,
  cultural_priorities JSONB DEFAULT '[]'::jsonb,
  communication_style TEXT,
  typical_interview_duration_mins INT,
  question_difficulty_level TEXT,
  focus_areas TEXT[],
  meetings_analyzed INT DEFAULT 0,
  last_analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hiring_manager_user ON hiring_manager_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_hiring_manager_company ON hiring_manager_profiles(company_id);

-- Create candidate_interview_performance table
CREATE TABLE IF NOT EXISTS candidate_interview_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  communication_clarity_score DECIMAL(3,2) CHECK (communication_clarity_score >= 0 AND communication_clarity_score <= 1),
  communication_conciseness_score DECIMAL(3,2) CHECK (communication_conciseness_score >= 0 AND communication_conciseness_score <= 1),
  communication_confidence_score DECIMAL(3,2) CHECK (communication_confidence_score >= 0 AND communication_confidence_score <= 1),
  technical_competence_score DECIMAL(3,2) CHECK (technical_competence_score >= 0 AND technical_competence_score <= 1),
  cultural_fit_score DECIMAL(3,2) CHECK (cultural_fit_score >= 0 AND cultural_fit_score <= 1),
  answer_quality JSONB DEFAULT '[]'::jsonb,
  red_flags TEXT[],
  green_flags TEXT[],
  coaching_suggestions TEXT[],
  key_strengths TEXT[],
  areas_for_improvement TEXT[],
  overall_impression TEXT,
  hiring_recommendation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidate_performance_candidate ON candidate_interview_performance(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_performance_meeting ON candidate_interview_performance(meeting_id);

-- Create meeting_intelligence_processing table
CREATE TABLE IF NOT EXISTS meeting_intelligence_processing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  processing_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  result_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_processing_meeting ON meeting_intelligence_processing(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_processing_status ON meeting_intelligence_processing(status);

-- Enable RLS
ALTER TABLE interview_question_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE hiring_manager_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_interview_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_intelligence_processing ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Simplified to allow authenticated users to access relevant data
CREATE POLICY "interview_patterns_select" ON interview_question_patterns
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "interview_patterns_insert" ON interview_question_patterns
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "hiring_profiles_select" ON hiring_manager_profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "hiring_profiles_insert" ON hiring_manager_profiles
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "candidate_performance_select" ON candidate_interview_performance
  FOR SELECT TO authenticated USING (
    candidate_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid())
    OR meeting_id IN (SELECT id FROM meetings WHERE host_id = auth.uid())
  );

CREATE POLICY "candidate_performance_insert" ON candidate_interview_performance
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "meeting_processing_select" ON meeting_intelligence_processing
  FOR SELECT TO authenticated USING (true);

-- Function to queue meeting intelligence processing
CREATE OR REPLACE FUNCTION queue_meeting_intelligence_processing()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'ended' AND (OLD.status IS NULL OR OLD.status != 'ended') THEN
    INSERT INTO meeting_intelligence_processing (meeting_id, processing_type, status)
    VALUES (NEW.id, 'transcript_analysis', 'pending')
    ON CONFLICT DO NOTHING;
    
    IF NEW.meeting_type IN ('interview', 'technical_interview', 'behavioral_interview') THEN
      INSERT INTO meeting_intelligence_processing (meeting_id, processing_type, status)
      VALUES (NEW.id, 'hiring_manager_patterns', 'pending')
      ON CONFLICT DO NOTHING;
      
      IF NEW.candidate_id IS NOT NULL THEN
        INSERT INTO meeting_intelligence_processing (meeting_id, processing_type, status)
        VALUES (NEW.id, 'candidate_performance', 'pending')
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_queue_meeting_intelligence ON meetings;
CREATE TRIGGER trigger_queue_meeting_intelligence
AFTER UPDATE ON meetings
FOR EACH ROW
EXECUTE FUNCTION queue_meeting_intelligence_processing();
-- Interview Intelligence Tables

-- Interview Prep Briefs (generated before interview starts)
CREATE TABLE IF NOT EXISTS public.interview_prep_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES public.candidate_profiles(id) ON DELETE SET NULL,
  role_title TEXT,
  company_name TEXT,
  
  -- AI-generated prep content
  candidate_summary TEXT,
  key_strengths TEXT[],
  potential_concerns TEXT[],
  cv_gaps TEXT[],
  suggested_questions JSONB, -- [{question: string, category: string, priority: string}]
  conversation_starters TEXT[],
  technical_topics TEXT[],
  
  generated_at TIMESTAMPTZ DEFAULT now(),
  generated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Real-time Interview Intelligence (updated during interview)
CREATE TABLE IF NOT EXISTS public.interview_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES public.candidate_profiles(id) ON DELETE SET NULL,
  
  -- Real-time scoring (0-100 for each)
  communication_clarity_score INTEGER DEFAULT 0,
  technical_depth_score INTEGER DEFAULT 0,
  culture_fit_score INTEGER DEFAULT 0,
  confidence_score INTEGER DEFAULT 0,
  overall_score INTEGER DEFAULT 0,
  
  -- Analysis data
  red_flags JSONB, -- [{flag: string, severity: string, timestamp: string}]
  positive_signals JSONB, -- [{signal: string, timestamp: string}]
  follow_up_suggestions TEXT[],
  topic_coverage JSONB, -- {technical: 60, behavioral: 80, culture: 40}
  
  -- Metadata
  last_updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Post-Interview Reports (generated after interview ends)
CREATE TABLE IF NOT EXISTS public.interview_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES public.candidate_profiles(id) ON DELETE SET NULL,
  
  -- Report content
  executive_summary TEXT,
  key_strengths TEXT[],
  key_weaknesses TEXT[],
  technical_assessment TEXT,
  cultural_fit_assessment TEXT,
  communication_assessment TEXT,
  
  -- Highlights with timestamps
  highlights JSONB, -- [{timestamp: string, clip_start: number, clip_end: number, description: string, type: string}]
  
  -- Decision recommendation
  recommendation TEXT, -- 'advance', 'reject', 'reconsider'
  recommendation_confidence INTEGER, -- 0-100
  recommendation_reasoning TEXT,
  
  -- Comparison data (if available)
  percentile_rank INTEGER, -- compared to other candidates for same role
  comparison_notes TEXT,
  
  generated_at TIMESTAMPTZ DEFAULT now(),
  generated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_interview_prep_briefs_meeting ON public.interview_prep_briefs(meeting_id);
CREATE INDEX IF NOT EXISTS idx_interview_intelligence_meeting ON public.interview_intelligence(meeting_id);
CREATE INDEX IF NOT EXISTS idx_interview_reports_meeting ON public.interview_reports(meeting_id);
CREATE INDEX IF NOT EXISTS idx_interview_reports_candidate ON public.interview_reports(candidate_id);

-- RLS Policies

ALTER TABLE public.interview_prep_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_reports ENABLE ROW LEVEL SECURITY;

-- Only meeting participants (interviewers) can view prep briefs
CREATE POLICY "Interviewers can view prep briefs"
ON public.interview_prep_briefs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.meeting_participants mp
    WHERE mp.meeting_id = interview_prep_briefs.meeting_id
    AND mp.user_id = auth.uid()
    AND mp.role IN ('host', 'interviewer', 'observer')
  )
);

-- Only interviewers can view real-time intelligence (NOT candidates)
CREATE POLICY "Interviewers can view intelligence"
ON public.interview_intelligence FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.meeting_participants mp
    WHERE mp.meeting_id = interview_intelligence.meeting_id
    AND mp.user_id = auth.uid()
    AND mp.role IN ('host', 'interviewer', 'observer')
  )
);

-- Service role can insert/update intelligence
CREATE POLICY "Service role can manage intelligence"
ON public.interview_intelligence FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Only interviewers can view reports (NOT candidates by default)
CREATE POLICY "Interviewers can view reports"
ON public.interview_reports FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.meeting_participants mp
    WHERE mp.meeting_id = interview_reports.meeting_id
    AND mp.user_id = auth.uid()
    AND mp.role IN ('host', 'interviewer', 'observer')
  )
);

-- Service role can insert/update reports
CREATE POLICY "Service role can manage reports"
ON public.interview_reports FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
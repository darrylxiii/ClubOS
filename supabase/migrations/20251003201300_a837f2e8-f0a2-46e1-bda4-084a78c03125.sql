-- Add candidate scorecards/feedback table
CREATE TABLE IF NOT EXISTS public.candidate_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL,
  evaluator_id UUID NOT NULL,
  stage_index INTEGER NOT NULL,
  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
  technical_score INTEGER CHECK (technical_score BETWEEN 1 AND 5),
  cultural_fit_score INTEGER CHECK (cultural_fit_score BETWEEN 1 AND 5),
  communication_score INTEGER CHECK (communication_score BETWEEN 1 AND 5),
  strengths TEXT,
  concerns TEXT,
  recommendation TEXT CHECK (recommendation IN ('strong_yes', 'yes', 'neutral', 'no', 'strong_no')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add interviews table (note: job_id as UUID to match jobs table)
CREATE TABLE IF NOT EXISTS public.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL,
  job_id UUID NOT NULL,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  interview_type TEXT NOT NULL CHECK (interview_type IN ('phone', 'video', 'onsite', 'technical', 'behavioral', 'panel')),
  stage_index INTEGER NOT NULL,
  location TEXT,
  meeting_link TEXT,
  interviewers UUID[] DEFAULT ARRAY[]::UUID[],
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled', 'no_show')),
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add candidate notes/comments table
CREATE TABLE IF NOT EXISTS public.candidate_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT true,
  mentioned_users UUID[] DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add analytics/reporting events table (note: job_id as UUID)
CREATE TABLE IF NOT EXISTS public.pipeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL,
  job_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('stage_change', 'interview_scheduled', 'feedback_added', 'status_change', 'message_sent')),
  from_stage INTEGER,
  to_stage INTEGER,
  performed_by UUID NOT NULL,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE public.candidate_scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for candidate_scorecards
CREATE POLICY "Company members can view scorecards for their jobs"
  ON public.candidate_scorecards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.jobs j ON a.job_id::uuid = j.id
      WHERE a.id = application_id
        AND (is_company_member(auth.uid(), j.company_id) OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE POLICY "Company members can create scorecards"
  ON public.candidate_scorecards FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.jobs j ON a.job_id::uuid = j.id
      WHERE a.id = application_id
        AND is_company_member(auth.uid(), j.company_id)
    )
    AND evaluator_id = auth.uid()
  );

CREATE POLICY "Evaluators can update their own scorecards"
  ON public.candidate_scorecards FOR UPDATE
  USING (evaluator_id = auth.uid());

-- RLS Policies for interviews
CREATE POLICY "Company members can view interviews"
  ON public.interviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_id
        AND (is_company_member(auth.uid(), j.company_id) OR has_role(auth.uid(), 'admin'::app_role))
    )
    OR auth.uid() = ANY(interviewers)
  );

CREATE POLICY "Company members can create interviews"
  ON public.interviews FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_id
        AND is_company_member(auth.uid(), j.company_id)
    )
  );

CREATE POLICY "Company members can update interviews"
  ON public.interviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_id
        AND is_company_member(auth.uid(), j.company_id)
    )
  );

-- RLS Policies for candidate_comments
CREATE POLICY "Company members can view comments"
  ON public.candidate_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.jobs j ON a.job_id::uuid = j.id
      WHERE a.id = application_id
        AND (is_company_member(auth.uid(), j.company_id) OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE POLICY "Company members can create comments"
  ON public.candidate_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.jobs j ON a.job_id::uuid = j.id
      WHERE a.id = application_id
        AND is_company_member(auth.uid(), j.company_id)
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update their own comments"
  ON public.candidate_comments FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies for pipeline_events
CREATE POLICY "Company members can view pipeline events"
  ON public.pipeline_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_id
        AND (is_company_member(auth.uid(), j.company_id) OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE POLICY "Company members can create pipeline events"
  ON public.pipeline_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_id
        AND is_company_member(auth.uid(), j.company_id)
    )
  );

-- Add triggers for updated_at
CREATE TRIGGER update_candidate_scorecards_updated_at
  BEFORE UPDATE ON public.candidate_scorecards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_interviews_updated_at
  BEFORE UPDATE ON public.interviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_candidate_comments_updated_at
  BEFORE UPDATE ON public.candidate_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_candidate_scorecards_application ON public.candidate_scorecards(application_id);
CREATE INDEX idx_interviews_application ON public.interviews(application_id);
CREATE INDEX idx_interviews_job ON public.interviews(job_id);
CREATE INDEX idx_candidate_comments_application ON public.candidate_comments(application_id);
CREATE INDEX idx_pipeline_events_application ON public.pipeline_events(application_id);
CREATE INDEX idx_pipeline_events_job ON public.pipeline_events(job_id);
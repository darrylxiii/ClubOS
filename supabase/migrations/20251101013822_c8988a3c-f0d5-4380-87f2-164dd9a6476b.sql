-- Create Incubator:20 assessment tables

-- Sessions table for tracking assessment attempts
CREATE TABLE IF NOT EXISTS public.incubator_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_result_id UUID REFERENCES public.assessment_results(id) ON DELETE SET NULL,
  
  -- Scenario configuration
  scenario_seed JSONB NOT NULL,
  scenario_difficulty NUMERIC DEFAULT 1.0,
  
  -- Phase timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  brief_completed_at TIMESTAMPTZ,
  frame_completed_at TIMESTAMPTZ,
  build_completed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  
  -- Frame answers (strategic north star)
  frame_problem TEXT,
  frame_customer TEXT,
  frame_success_metric TEXT,
  
  -- Final deliverable
  final_plan JSONB,
  word_count INTEGER,
  voice_rationale_url TEXT,
  voice_rationale_transcript TEXT,
  
  -- Computed scores
  plan_quality_score NUMERIC,
  ai_collab_score NUMERIC,
  communication_score NUMERIC,
  total_score NUMERIC,
  normalized_score NUMERIC,
  
  -- Capability vector for role matching
  capability_vector JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Action log for granular tracking
CREATE TABLE IF NOT EXISTS public.incubator_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.incubator_sessions(id) ON DELETE CASCADE,
  timestamp_ms BIGINT NOT NULL,
  action_type TEXT NOT NULL,
  payload JSONB,
  
  -- AI-specific tracking
  prompt_text TEXT,
  tool_used TEXT,
  ai_response TEXT,
  tokens_used INTEGER,
  response_action TEXT,
  edit_delta JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scoring evidence table
CREATE TABLE IF NOT EXISTS public.incubator_scoring_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.incubator_sessions(id) ON DELETE CASCADE,
  rubric_component TEXT NOT NULL,
  raw_score NUMERIC,
  normalized_score NUMERIC,
  evidence_snippets JSONB,
  llm_rationale TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.incubator_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incubator_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incubator_scoring_evidence ENABLE ROW LEVEL SECURITY;

-- RLS Policies for incubator_sessions
CREATE POLICY "Users can view their own incubator sessions"
  ON public.incubator_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own incubator sessions"
  ON public.incubator_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own incubator sessions"
  ON public.incubator_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for incubator_actions
CREATE POLICY "Users can view actions for their sessions"
  ON public.incubator_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.incubator_sessions
      WHERE incubator_sessions.id = incubator_actions.session_id
      AND incubator_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create actions for their sessions"
  ON public.incubator_actions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.incubator_sessions
      WHERE incubator_sessions.id = incubator_actions.session_id
      AND incubator_sessions.user_id = auth.uid()
    )
  );

-- RLS Policies for incubator_scoring_evidence
CREATE POLICY "Users can view scoring evidence for their sessions"
  ON public.incubator_scoring_evidence FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.incubator_sessions
      WHERE incubator_sessions.id = incubator_scoring_evidence.session_id
      AND incubator_sessions.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX idx_incubator_sessions_user_id ON public.incubator_sessions(user_id);
CREATE INDEX idx_incubator_sessions_created_at ON public.incubator_sessions(created_at DESC);
CREATE INDEX idx_incubator_actions_session_id ON public.incubator_actions(session_id);
CREATE INDEX idx_incubator_actions_timestamp ON public.incubator_actions(timestamp_ms);
CREATE INDEX idx_incubator_scoring_session_id ON public.incubator_scoring_evidence(session_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_incubator_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_incubator_sessions_updated_at
  BEFORE UPDATE ON public.incubator_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_incubator_sessions_updated_at();
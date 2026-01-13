-- AI Memory and Context Storage
CREATE TABLE IF NOT EXISTS public.ai_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('preference', 'goal', 'skill', 'interaction', 'feedback', 'insight')),
  content TEXT NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  relevance_score NUMERIC DEFAULT 1.0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_memory_user_id ON public.ai_memory(user_id);
CREATE INDEX idx_ai_memory_type ON public.ai_memory(memory_type);
CREATE INDEX idx_ai_memory_relevance ON public.ai_memory(relevance_score DESC);

-- Session Scoring and Analytics
CREATE TABLE IF NOT EXISTS public.ai_session_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quality_score NUMERIC CHECK (quality_score >= 0 AND quality_score <= 10),
  helpfulness_score NUMERIC CHECK (helpfulness_score >= 0 AND helpfulness_score <= 10),
  actionability_score NUMERIC CHECK (actionability_score >= 0 AND actionability_score <= 10),
  context_accuracy_score NUMERIC CHECK (context_accuracy_score >= 0 AND context_accuracy_score <= 10),
  response_time_ms INTEGER,
  tokens_used INTEGER,
  tools_invoked TEXT[],
  outcomes_achieved TEXT[],
  user_sentiment TEXT CHECK (user_sentiment IN ('positive', 'neutral', 'negative', 'mixed')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_session_scores_user ON public.ai_session_scores(user_id);
CREATE INDEX idx_session_scores_date ON public.ai_session_scores(session_date DESC);
CREATE INDEX idx_session_scores_conversation ON public.ai_session_scores(conversation_id);

-- Synthetic Persona Profiles
CREATE TABLE IF NOT EXISTS public.ai_persona_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_name TEXT NOT NULL,
  persona_type TEXT NOT NULL CHECK (persona_type IN ('interviewer', 'hiring_manager', 'recruiter', 'mentor', 'peer', 'executive', 'custom')),
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  role_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  characteristics JSONB NOT NULL DEFAULT '{}'::jsonb,
  communication_style JSONB DEFAULT '{}'::jsonb,
  typical_questions TEXT[],
  evaluation_criteria TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_persona_user ON public.ai_persona_profiles(user_id);
CREATE INDEX idx_persona_type ON public.ai_persona_profiles(persona_type);
CREATE INDEX idx_persona_company ON public.ai_persona_profiles(company_id);

-- User Feedback on AI Sessions
CREATE TABLE IF NOT EXISTS public.ai_session_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id TEXT,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('thumbs_up', 'thumbs_down', 'report', 'suggestion', 'rating')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  categories TEXT[],
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_feedback_user ON public.ai_session_feedback(user_id);
CREATE INDEX idx_feedback_conversation ON public.ai_session_feedback(conversation_id);
CREATE INDEX idx_feedback_type ON public.ai_session_feedback(feedback_type);

-- Industry and Job Trend Monitoring
CREATE TABLE IF NOT EXISTS public.career_trend_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_type TEXT NOT NULL CHECK (trend_type IN ('industry', 'skill', 'company', 'role', 'salary', 'market')),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  impact_level TEXT CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),
  geographic_scope TEXT[],
  relevant_industries TEXT[],
  relevant_roles TEXT[],
  source_url TEXT,
  confidence_score NUMERIC CHECK (confidence_score >= 0 AND confidence_score <= 1),
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trends_type ON public.career_trend_insights(trend_type);
CREATE INDEX idx_trends_category ON public.career_trend_insights(category);
CREATE INDEX idx_trends_impact ON public.career_trend_insights(impact_level);
CREATE INDEX idx_trends_valid ON public.career_trend_insights(valid_from, valid_until);

-- User-specific trend subscriptions and alerts
CREATE TABLE IF NOT EXISTS public.user_trend_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trend_id UUID NOT NULL REFERENCES public.career_trend_insights(id) ON DELETE CASCADE,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  alerted_at TIMESTAMPTZ,
  is_relevant BOOLEAN DEFAULT true,
  user_notes TEXT,
  UNIQUE(user_id, trend_id)
);

CREATE INDEX idx_user_trends ON public.user_trend_subscriptions(user_id);
CREATE INDEX idx_trend_subscribers ON public.user_trend_subscriptions(trend_id);

-- Career Context Snapshots (unified career brain state)
CREATE TABLE IF NOT EXISTS public.career_context_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  active_applications JSONB DEFAULT '[]'::jsonb,
  upcoming_interviews JSONB DEFAULT '[]'::jsonb,
  pending_tasks JSONB DEFAULT '[]'::jsonb,
  skill_gaps JSONB DEFAULT '[]'::jsonb,
  career_goals JSONB DEFAULT '[]'::jsonb,
  network_insights JSONB DEFAULT '{}'::jsonb,
  market_position JSONB DEFAULT '{}'::jsonb,
  next_best_actions TEXT[],
  urgency_flags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_context_user ON public.career_context_snapshots(user_id);
CREATE INDEX idx_context_date ON public.career_context_snapshots(snapshot_date DESC);

-- Enable RLS
ALTER TABLE public.ai_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_session_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_persona_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_session_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_trend_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_trend_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_context_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_memory
CREATE POLICY "Users can view their own AI memory"
  ON public.ai_memory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI memory"
  ON public.ai_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI memory"
  ON public.ai_memory FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI memory"
  ON public.ai_memory FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for ai_session_scores
CREATE POLICY "Users can view their own session scores"
  ON public.ai_session_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert session scores"
  ON public.ai_session_scores FOR INSERT
  WITH CHECK (true);

-- RLS Policies for ai_persona_profiles
CREATE POLICY "Users can view their own persona profiles"
  ON public.ai_persona_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own persona profiles"
  ON public.ai_persona_profiles FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for ai_session_feedback
CREATE POLICY "Users can view their own feedback"
  ON public.ai_session_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can submit feedback"
  ON public.ai_session_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for career_trend_insights
CREATE POLICY "Trends are viewable by all authenticated users"
  ON public.career_trend_insights FOR SELECT
  USING (auth.role() = 'authenticated');

-- RLS Policies for user_trend_subscriptions
CREATE POLICY "Users can manage their own trend subscriptions"
  ON public.user_trend_subscriptions FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for career_context_snapshots
CREATE POLICY "Users can view their own context snapshots"
  ON public.career_context_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can create context snapshots"
  ON public.career_context_snapshots FOR INSERT
  WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_ai_memory_updated_at
  BEFORE UPDATE ON public.ai_memory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_persona_profiles_updated_at
  BEFORE UPDATE ON public.ai_persona_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
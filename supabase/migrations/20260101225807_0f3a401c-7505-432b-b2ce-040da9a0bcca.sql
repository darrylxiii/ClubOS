-- =====================================================
-- ENTERPRISE INTELLIGENCE SYSTEM - UNFAIR ADVANTAGE
-- =====================================================

-- 1. Stakeholder Long-term Memory
CREATE TABLE IF NOT EXISTS public.stakeholder_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_id UUID REFERENCES public.company_stakeholders(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('preference', 'quote', 'commitment', 'pattern', 'objection', 'insight')),
  content TEXT NOT NULL,
  context TEXT,
  source_type TEXT,
  source_id UUID,
  confidence_score NUMERIC DEFAULT 0.8 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  tags TEXT[] DEFAULT '{}',
  last_validated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Candidate Company History
CREATE TABLE IF NOT EXISTS public.candidate_company_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('sourced', 'applied', 'screened', 'interviewed', 'offered', 'hired', 'rejected', 'withdrew', 'ghosted')),
  stage_reached TEXT,
  outcome_reason TEXT,
  feedback_summary TEXT,
  salary_discussed NUMERIC,
  currency TEXT DEFAULT 'EUR',
  could_revisit BOOLEAN DEFAULT false,
  revisit_after TIMESTAMPTZ,
  relationship_quality TEXT CHECK (relationship_quality IN ('excellent', 'good', 'neutral', 'poor')),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Predictive Signals
CREATE TABLE IF NOT EXISTS public.predictive_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('company', 'candidate', 'deal', 'stakeholder', 'job')),
  entity_id UUID NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN (
    'cooling_off', 'heating_up', 'ready_to_move', 'hiring_intent',
    'budget_approved', 'urgency_increase', 'competitor_threat',
    'relationship_risk', 'opportunity_window', 're_engagement'
  )),
  signal_strength NUMERIC NOT NULL CHECK (signal_strength >= 0 AND signal_strength <= 1),
  evidence JSONB NOT NULL DEFAULT '{}',
  contributing_factors TEXT[],
  recommended_actions TEXT[],
  detected_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  actioned_at TIMESTAMPTZ,
  actioned_by UUID REFERENCES public.profiles(id),
  outcome TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Success Patterns Library
CREATE TABLE IF NOT EXISTS public.success_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type TEXT NOT NULL CHECK (pattern_type IN (
    'objection_response', 'closing_technique', 'outreach_template',
    'negotiation_tactic', 'relationship_building', 'timing_pattern',
    'communication_style', 'pricing_strategy'
  )),
  industry TEXT,
  company_size TEXT,
  seniority_level TEXT,
  context JSONB DEFAULT '{}',
  pattern_description TEXT NOT NULL,
  example_content TEXT,
  success_rate NUMERIC CHECK (success_rate >= 0 AND success_rate <= 1),
  sample_size INTEGER DEFAULT 1,
  learned_from JSONB DEFAULT '[]',
  contributed_by UUID REFERENCES public.profiles(id),
  is_verified BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Intelligence Embeddings
CREATE TABLE IF NOT EXISTS public.intelligence_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entity_type, entity_id)
);

-- 6. Intelligence Queries Log
CREATE TABLE IF NOT EXISTS public.intelligence_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  query_type TEXT NOT NULL,
  query_text TEXT,
  query_params JSONB,
  results_count INTEGER,
  result_clicked_ids UUID[],
  was_helpful BOOLEAN,
  feedback TEXT,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_stakeholder_memory_stakeholder ON public.stakeholder_memory(stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_stakeholder_memory_type ON public.stakeholder_memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_candidate_history_candidate ON public.candidate_company_history(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_history_company ON public.candidate_company_history(company_id);
CREATE INDEX IF NOT EXISTS idx_candidate_history_revisit ON public.candidate_company_history(could_revisit, revisit_after) WHERE could_revisit = true;
CREATE INDEX IF NOT EXISTS idx_predictive_signals_entity ON public.predictive_signals(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_predictive_signals_active ON public.predictive_signals(is_active, expires_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_success_patterns_type ON public.success_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_intelligence_embeddings_entity ON public.intelligence_embeddings(entity_type, entity_id);

-- RLS
ALTER TABLE public.stakeholder_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_company_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictive_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.success_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intelligence_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intelligence_queries ENABLE ROW LEVEL SECURITY;

-- Policies using user_roles.role check (without is_active since it doesn't exist)
CREATE POLICY "Admins and strategists can manage stakeholder memory"
  ON public.stakeholder_memory FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admins and strategists can manage candidate history"
  ON public.candidate_company_history FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admins and strategists can manage signals"
  ON public.predictive_signals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Authenticated users can view success patterns"
  ON public.success_patterns FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and strategists can manage success patterns"
  ON public.success_patterns FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admins and strategists can update success patterns"
  ON public.success_patterns FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admins and strategists can delete success patterns"
  ON public.success_patterns FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admins and strategists can manage embeddings"
  ON public.intelligence_embeddings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Users can view own queries"
  ON public.intelligence_queries FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own queries"
  ON public.intelligence_queries FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all queries"
  ON public.intelligence_queries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Triggers for auto-update timestamps
CREATE OR REPLACE FUNCTION public.update_intelligence_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stakeholder_memory_timestamp
  BEFORE UPDATE ON public.stakeholder_memory
  FOR EACH ROW EXECUTE FUNCTION public.update_intelligence_timestamp();

CREATE TRIGGER update_candidate_history_timestamp
  BEFORE UPDATE ON public.candidate_company_history
  FOR EACH ROW EXECUTE FUNCTION public.update_intelligence_timestamp();

CREATE TRIGGER update_success_patterns_timestamp
  BEFORE UPDATE ON public.success_patterns
  FOR EACH ROW EXECUTE FUNCTION public.update_intelligence_timestamp();
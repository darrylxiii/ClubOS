-- Phase 1: Enterprise Company Intelligence System

-- 1. Add company_id to meetings table for direct company linking
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- 2. Create index for company lookups on meetings
CREATE INDEX IF NOT EXISTS idx_meetings_company_id ON public.meetings(company_id);

-- 3. Backfill company_id from job_id where possible
UPDATE public.meetings m
SET company_id = j.company_id
FROM public.jobs j
WHERE m.job_id = j.id AND m.company_id IS NULL;

-- 4. Create entity_relationships table for knowledge graph
CREATE TABLE IF NOT EXISTS public.entity_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_type TEXT NOT NULL, -- 'company', 'stakeholder', 'candidate', 'job', 'meeting', 'interaction'
  source_id UUID NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  relationship_type TEXT NOT NULL, -- 'mentioned_in', 'participated_in', 'works_at', 'knows', 'referred', 'interviewed_for'
  strength_score NUMERIC DEFAULT 0.5, -- 0-1 relationship strength
  evidence_sources JSONB DEFAULT '[]'::jsonb, -- Array of {source_type, source_id, timestamp}
  context TEXT, -- Additional context about the relationship
  first_observed_at TIMESTAMPTZ DEFAULT now(),
  last_observed_at TIMESTAMPTZ DEFAULT now(),
  observation_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create indexes for entity_relationships
CREATE INDEX IF NOT EXISTS idx_entity_rel_source ON public.entity_relationships(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_entity_rel_target ON public.entity_relationships(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_entity_rel_type ON public.entity_relationships(relationship_type);

-- 6. Create company_intelligence_scores for aggregated company intelligence
CREATE TABLE IF NOT EXISTS public.company_intelligence_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  total_interactions INTEGER DEFAULT 0,
  total_meetings INTEGER DEFAULT 0,
  total_stakeholders INTEGER DEFAULT 0,
  total_insights INTEGER DEFAULT 0,
  avg_sentiment_score NUMERIC,
  avg_engagement_score NUMERIC,
  hiring_urgency_score NUMERIC, -- 0-1 based on signals
  relationship_health_score NUMERIC, -- 0-1 overall health
  last_interaction_at TIMESTAMPTZ,
  last_meeting_at TIMESTAMPTZ,
  intelligence_completeness NUMERIC DEFAULT 0, -- 0-100% how complete our data is
  key_topics TEXT[] DEFAULT '{}',
  active_job_count INTEGER DEFAULT 0,
  hired_count INTEGER DEFAULT 0,
  score_breakdown JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id)
);

-- 7. Create index for company intelligence scores
CREATE INDEX IF NOT EXISTS idx_company_intel_scores_company ON public.company_intelligence_scores(company_id);

-- 8. Create intelligence_timeline for temporal tracking
CREATE TABLE IF NOT EXISTS public.intelligence_timeline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL, -- 'company', 'stakeholder', 'job'
  entity_id UUID NOT NULL,
  event_type TEXT NOT NULL, -- 'interaction', 'meeting', 'insight', 'sentiment_change', 'urgency_spike'
  event_data JSONB DEFAULT '{}'::jsonb,
  significance_score NUMERIC DEFAULT 0.5, -- 0-1 how significant
  detected_at TIMESTAMPTZ DEFAULT now(),
  source_type TEXT, -- Where this intelligence came from
  source_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Create indexes for intelligence timeline
CREATE INDEX IF NOT EXISTS idx_intel_timeline_entity ON public.intelligence_timeline(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_intel_timeline_detected ON public.intelligence_timeline(detected_at DESC);

-- 10. Create meeting_intelligence table for processed meeting insights
CREATE TABLE IF NOT EXISTS public.meeting_intelligence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id),
  job_id UUID REFERENCES public.jobs(id),
  full_transcript TEXT,
  transcript_word_count INTEGER DEFAULT 0,
  summary TEXT,
  key_topics TEXT[] DEFAULT '{}',
  mentioned_candidates UUID[] DEFAULT '{}',
  mentioned_stakeholders UUID[] DEFAULT '{}',
  action_items JSONB DEFAULT '[]'::jsonb,
  decisions_made JSONB DEFAULT '[]'::jsonb,
  sentiment_analysis JSONB DEFAULT '{}'::jsonb,
  extracted_insights JSONB DEFAULT '[]'::jsonb,
  hiring_signals JSONB DEFAULT '{}'::jsonb,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_notes TEXT,
  processing_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(meeting_id)
);

-- 11. Create index for meeting intelligence
CREATE INDEX IF NOT EXISTS idx_meeting_intel_company ON public.meeting_intelligence(company_id);
CREATE INDEX IF NOT EXISTS idx_meeting_intel_status ON public.meeting_intelligence(processing_status);

-- 12. Enable RLS on new tables
ALTER TABLE public.entity_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_intelligence_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intelligence_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_intelligence ENABLE ROW LEVEL SECURITY;

-- 13. RLS policies for entity_relationships
CREATE POLICY "Authenticated users can view entity relationships"
  ON public.entity_relationships FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins and strategists can manage entity relationships"
  ON public.entity_relationships FOR ALL
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'strategist')
    )
  );

-- 14. RLS policies for company_intelligence_scores
CREATE POLICY "Authenticated users can view company intelligence scores"
  ON public.company_intelligence_scores FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins and strategists can manage company intelligence scores"
  ON public.company_intelligence_scores FOR ALL
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'strategist')
    )
  );

-- 15. RLS policies for intelligence_timeline
CREATE POLICY "Authenticated users can view intelligence timeline"
  ON public.intelligence_timeline FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "System can insert intelligence timeline"
  ON public.intelligence_timeline FOR INSERT
  TO authenticated WITH CHECK (true);

-- 16. RLS policies for meeting_intelligence
CREATE POLICY "Authenticated users can view meeting intelligence"
  ON public.meeting_intelligence FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins and strategists can manage meeting intelligence"
  ON public.meeting_intelligence FOR ALL
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'strategist')
    )
  );

-- 17. Create function to update company intelligence scores
CREATE OR REPLACE FUNCTION public.update_company_intelligence_score(p_company_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_interactions INTEGER;
  v_total_meetings INTEGER;
  v_total_stakeholders INTEGER;
  v_total_insights INTEGER;
  v_avg_sentiment NUMERIC;
  v_avg_engagement NUMERIC;
  v_last_interaction TIMESTAMPTZ;
  v_last_meeting TIMESTAMPTZ;
  v_active_jobs INTEGER;
  v_hired_count INTEGER;
BEGIN
  -- Count interactions
  SELECT COUNT(*) INTO v_total_interactions
  FROM company_interactions WHERE company_id = p_company_id AND status = 'active';
  
  -- Count meetings
  SELECT COUNT(*) INTO v_total_meetings
  FROM meetings WHERE company_id = p_company_id;
  
  -- Count stakeholders
  SELECT COUNT(*) INTO v_total_stakeholders
  FROM company_stakeholders WHERE company_id = p_company_id;
  
  -- Count insights
  SELECT COUNT(*) INTO v_total_insights
  FROM interaction_insights ii
  JOIN company_interactions ci ON ii.interaction_id = ci.id
  WHERE ci.company_id = p_company_id;
  
  -- Calculate average sentiment
  SELECT AVG(sentiment_score) INTO v_avg_sentiment
  FROM company_interactions WHERE company_id = p_company_id AND sentiment_score IS NOT NULL;
  
  -- Calculate average stakeholder engagement
  SELECT AVG(engagement_score) INTO v_avg_engagement
  FROM company_stakeholders WHERE company_id = p_company_id AND engagement_score IS NOT NULL;
  
  -- Get last interaction date
  SELECT MAX(interaction_date) INTO v_last_interaction
  FROM company_interactions WHERE company_id = p_company_id;
  
  -- Get last meeting date
  SELECT MAX(start_time) INTO v_last_meeting
  FROM meetings WHERE company_id = p_company_id;
  
  -- Count active jobs
  SELECT COUNT(*) INTO v_active_jobs
  FROM jobs WHERE company_id = p_company_id AND status = 'open';
  
  -- Count hired
  SELECT COUNT(*) INTO v_hired_count
  FROM applications a
  JOIN jobs j ON a.job_id = j.id
  WHERE j.company_id = p_company_id AND a.status = 'hired';
  
  -- Upsert the score
  INSERT INTO company_intelligence_scores (
    company_id, total_interactions, total_meetings, total_stakeholders,
    total_insights, avg_sentiment_score, avg_engagement_score,
    last_interaction_at, last_meeting_at, active_job_count, hired_count,
    intelligence_completeness, updated_at
  ) VALUES (
    p_company_id, v_total_interactions, v_total_meetings, v_total_stakeholders,
    v_total_insights, v_avg_sentiment, v_avg_engagement,
    v_last_interaction, v_last_meeting, v_active_jobs, v_hired_count,
    LEAST(100, (COALESCE(v_total_interactions, 0) + COALESCE(v_total_meetings, 0) * 3 + COALESCE(v_total_stakeholders, 0) * 2) / 2.0),
    now()
  )
  ON CONFLICT (company_id) DO UPDATE SET
    total_interactions = EXCLUDED.total_interactions,
    total_meetings = EXCLUDED.total_meetings,
    total_stakeholders = EXCLUDED.total_stakeholders,
    total_insights = EXCLUDED.total_insights,
    avg_sentiment_score = EXCLUDED.avg_sentiment_score,
    avg_engagement_score = EXCLUDED.avg_engagement_score,
    last_interaction_at = EXCLUDED.last_interaction_at,
    last_meeting_at = EXCLUDED.last_meeting_at,
    active_job_count = EXCLUDED.active_job_count,
    hired_count = EXCLUDED.hired_count,
    intelligence_completeness = EXCLUDED.intelligence_completeness,
    updated_at = now();
END;
$$;

-- 18. Create trigger to auto-update company intelligence on new interaction
CREATE OR REPLACE FUNCTION public.trigger_update_company_intelligence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    PERFORM update_company_intelligence_score(NEW.company_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on company_interactions
DROP TRIGGER IF EXISTS update_company_intel_on_interaction ON public.company_interactions;
CREATE TRIGGER update_company_intel_on_interaction
  AFTER INSERT OR UPDATE ON public.company_interactions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_company_intelligence();

-- 19. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_company_intelligence_score(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_company_intelligence_score(UUID) TO service_role;
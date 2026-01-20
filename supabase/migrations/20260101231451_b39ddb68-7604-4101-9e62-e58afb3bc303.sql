-- ===========================================
-- LIVEHUB ENTERPRISE INTELLIGENCE INTEGRATION
-- ===========================================

-- 1. Add entity context to live_channels
ALTER TABLE public.live_channels 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id),
ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.jobs(id),
ADD COLUMN IF NOT EXISTS candidate_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS purpose_tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS auto_record TEXT DEFAULT 'ask' CHECK (auto_record IN ('always', 'ask', 'never')),
ADD COLUMN IF NOT EXISTS privacy_level TEXT DEFAULT 'full_capture' CHECK (privacy_level IN ('full_capture', 'summary_only', 'no_capture'));

-- 2. Create dedicated LiveHub transcripts table (separate from meeting_transcripts for LiveHub-specific needs)
CREATE TABLE IF NOT EXISTS public.livehub_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES public.live_channels(id) ON DELETE CASCADE,
  recording_id UUID REFERENCES public.live_channel_recordings(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id),
  speaker_name TEXT,
  text TEXT NOT NULL,
  timestamp_ms BIGINT,
  confidence NUMERIC,
  is_final BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create conversation patterns for learning
CREATE TABLE IF NOT EXISTS public.livehub_conversation_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES public.live_channels(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL, -- 'duration_optimal', 'topic_transition', 'engagement_peak', 'successful_outcome'
  pattern_data JSONB NOT NULL DEFAULT '{}',
  outcome_correlation NUMERIC,
  sample_size INTEGER DEFAULT 1,
  detected_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create session summaries table for AI-processed recordings
CREATE TABLE IF NOT EXISTS public.livehub_session_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID REFERENCES public.live_channel_recordings(id) ON DELETE CASCADE UNIQUE,
  channel_id UUID REFERENCES public.live_channels(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  summary TEXT,
  key_topics TEXT[] DEFAULT '{}',
  action_items JSONB DEFAULT '[]',
  decisions_made JSONB DEFAULT '[]',
  mentioned_entities JSONB DEFAULT '{}', -- {companies: [], candidates: [], jobs: []}
  participant_insights JSONB DEFAULT '{}',
  sentiment_analysis JSONB DEFAULT '{}',
  duration_seconds INTEGER,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create intelligence bridge log to track what's been synced
CREATE TABLE IF NOT EXISTS public.livehub_intelligence_bridge_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID REFERENCES public.live_channel_recordings(id) ON DELETE CASCADE,
  bridge_type TEXT NOT NULL, -- 'company_interaction', 'entity_relationship', 'stakeholder_memory', 'timeline_event'
  target_id UUID, -- The ID of the created record in target table
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'skipped')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_livehub_transcripts_channel ON public.livehub_transcripts(channel_id);
CREATE INDEX IF NOT EXISTS idx_livehub_transcripts_recording ON public.livehub_transcripts(recording_id);
CREATE INDEX IF NOT EXISTS idx_livehub_transcripts_user ON public.livehub_transcripts(user_id);
CREATE INDEX IF NOT EXISTS idx_livehub_transcripts_created ON public.livehub_transcripts(created_at);
CREATE INDEX IF NOT EXISTS idx_livehub_session_summaries_recording ON public.livehub_session_summaries(recording_id);
CREATE INDEX IF NOT EXISTS idx_livehub_session_summaries_channel ON public.livehub_session_summaries(channel_id);
CREATE INDEX IF NOT EXISTS idx_livehub_session_summaries_company ON public.livehub_session_summaries(company_id);
CREATE INDEX IF NOT EXISTS idx_live_channels_company ON public.live_channels(company_id);
CREATE INDEX IF NOT EXISTS idx_live_channels_job ON public.live_channels(job_id);

-- 7. Enable RLS
ALTER TABLE public.livehub_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.livehub_conversation_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.livehub_session_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.livehub_intelligence_bridge_log ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies for livehub_transcripts
CREATE POLICY "Users can view transcripts from channels they have access to"
ON public.livehub_transcripts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.live_server_members sm
    JOIN public.live_channels c ON c.server_id = sm.server_id
    WHERE c.id = livehub_transcripts.channel_id
    AND sm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'strategist')
  )
);

CREATE POLICY "Users can insert their own transcripts"
ON public.livehub_transcripts FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'strategist')
  )
);

-- 9. RLS Policies for livehub_conversation_patterns
CREATE POLICY "Admins and strategists can view conversation patterns"
ON public.livehub_conversation_patterns FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'strategist')
  )
);

CREATE POLICY "Admins and strategists can manage conversation patterns"
ON public.livehub_conversation_patterns FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'strategist')
  )
);

-- 10. RLS Policies for livehub_session_summaries
CREATE POLICY "Users can view summaries from channels they have access to"
ON public.livehub_session_summaries FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.live_server_members sm
    JOIN public.live_channels c ON c.server_id = sm.server_id
    WHERE c.id = livehub_session_summaries.channel_id
    AND sm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'strategist')
  )
);

CREATE POLICY "Service role can manage session summaries"
ON public.livehub_session_summaries FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'strategist')
  )
);

-- 11. RLS Policies for livehub_intelligence_bridge_log
CREATE POLICY "Admins can view bridge logs"
ON public.livehub_intelligence_bridge_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can manage bridge logs"
ON public.livehub_intelligence_bridge_log FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- 12. Updated_at triggers
CREATE TRIGGER update_livehub_conversation_patterns_updated_at
BEFORE UPDATE ON public.livehub_conversation_patterns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_livehub_session_summaries_updated_at
BEFORE UPDATE ON public.livehub_session_summaries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 13. Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.livehub_transcripts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.livehub_session_summaries;
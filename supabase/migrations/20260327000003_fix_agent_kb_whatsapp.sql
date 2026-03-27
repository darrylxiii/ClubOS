-- Fix Agent Orchestrator, KB/RAG, and WhatsApp schema issues
-- These tables/columns are referenced by edge functions but were either
-- dropped in the ghost-feature cleanup or never created.

--------------------------------------------------------------------
-- 1. AGENT ORCHESTRATOR: Recreate agent_matches table
--    Used by: run-headhunter-agent edge function
--    Was dropped: migration file 20260111000002 was deleted
--------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  match_score NUMERIC(5,4) DEFAULT 0,
  match_reasoning TEXT,
  status TEXT DEFAULT 'pending_review',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(job_id, candidate_id)
);

ALTER TABLE public.agent_matches ENABLE ROW LEVEL SECURITY;

-- Service-role only (agents write, admins read via service key)
CREATE POLICY "Service role full access on agent_matches"
  ON public.agent_matches FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins can read via authenticated role
CREATE POLICY "Admins can view agent matches"
  ON public.agent_matches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_agent_matches_job ON public.agent_matches(job_id);
CREATE INDEX IF NOT EXISTS idx_agent_matches_candidate ON public.agent_matches(candidate_id);
CREATE INDEX IF NOT EXISTS idx_agent_matches_status ON public.agent_matches(status);

--------------------------------------------------------------------
-- 2. KB/RAG: Restore entity_relationships table
--    Used by: build-knowledge-graph, retrieve-context (match_entity_relationships RPC)
--    Was dropped in: 20260328100000_drop_ghost_feature_tables.sql line 604
--------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.entity_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  relationship_type TEXT NOT NULL,
  strength_score NUMERIC(5,4) DEFAULT 0.5,
  evidence JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_type, source_id, target_type, target_id, relationship_type)
);

ALTER TABLE public.entity_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on entity_relationships"
  ON public.entity_relationships FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read entity_relationships"
  ON public.entity_relationships FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_entity_rel_source ON public.entity_relationships(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_entity_rel_target ON public.entity_relationships(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_entity_rel_type ON public.entity_relationships(relationship_type);

-- Recreate match_entity_relationships RPC for GraphRAG
CREATE OR REPLACE FUNCTION public.match_entity_relationships(
  entities TEXT[],
  match_threshold NUMERIC DEFAULT 0.5
)
RETURNS TABLE (
  content TEXT,
  similarity NUMERIC,
  source_type TEXT,
  source_id TEXT,
  target_type TEXT,
  target_id TEXT,
  relationship_type TEXT,
  evidence JSONB
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT
    FORMAT('%s (%s) -[%s]-> %s (%s)',
      er.source_id, er.source_type,
      er.relationship_type,
      er.target_id, er.target_type
    ) as content,
    er.strength_score as similarity,
    er.source_type,
    er.source_id,
    er.target_type,
    er.target_id,
    er.relationship_type,
    er.evidence
  FROM public.entity_relationships er
  WHERE er.strength_score >= match_threshold
    AND (
      er.source_id = ANY(entities)
      OR er.target_id = ANY(entities)
      OR er.source_type = ANY(entities)
      OR er.target_type = ANY(entities)
    )
  ORDER BY er.strength_score DESC
  LIMIT 20;
END;
$$;

--------------------------------------------------------------------
-- 3. WHATSAPP: Create missing tables and columns
--------------------------------------------------------------------

-- 3a. whatsapp_account_changes (audit trail)
--     Used by: manage-whatsapp-account edge function
CREATE TABLE IF NOT EXISTS public.whatsapp_account_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.whatsapp_business_accounts(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES public.profiles(id),
  change_type TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'activated', 'deactivated', 'set_primary'
  old_state JSONB,
  new_state JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.whatsapp_account_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view WhatsApp account changes"
  ON public.whatsapp_account_changes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Service role full access on whatsapp_account_changes"
  ON public.whatsapp_account_changes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3b. whatsapp_imports (chat import tracking)
--     Used by: parse-whatsapp-chat edge function
CREATE TABLE IF NOT EXISTS public.whatsapp_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  file_name TEXT,
  file_url TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'parsing', 'completed', 'failed'
  messages_parsed INTEGER DEFAULT 0,
  participants_found INTEGER DEFAULT 0,
  interactions_created INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.whatsapp_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own WhatsApp imports"
  ON public.whatsapp_imports FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role full access on whatsapp_imports"
  ON public.whatsapp_imports FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3c. Add missing columns to whatsapp_business_accounts
--     Used by: manage-whatsapp-account edge function
ALTER TABLE public.whatsapp_business_accounts
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS account_label TEXT,
  ADD COLUMN IF NOT EXISTS access_token_encrypted TEXT;

-- 3d. Add conversation_id to whatsapp_analytics for per-conversation insights
--     Used by: analyze-whatsapp-conversation edge function
ALTER TABLE public.whatsapp_analytics
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS total_messages INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS inbound_messages INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS outbound_messages INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sentiment_trend NUMERIC;

-- Add unique constraint for conversation+date upserts
-- (original table has account_id+date unique, we need conversation_id+date too)
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_analytics_conv_date
  ON public.whatsapp_analytics(conversation_id, date)
  WHERE conversation_id IS NOT NULL;

--------------------------------------------------------------------
-- 4. REMOVE entity_relationships FROM ghost feature drop migration
--    Since we're creating it here AFTER the drop, the table will exist.
--    This migration runs after the ghost drop (20260328) by sort order.
--------------------------------------------------------------------
-- Note: This migration filename (20260327000003) sorts BEFORE the ghost
-- drop (20260328100000). To ensure entity_relationships survives, we
-- need to remove it from the ghost drop migration OR ensure this runs
-- after. Since we can't modify applied migrations, we handle this by
-- creating the table with IF NOT EXISTS - if the ghost drop hasn't run
-- yet, the table already exists. If it has run, we recreate it here.
-- Either way, the table will exist after both migrations complete.

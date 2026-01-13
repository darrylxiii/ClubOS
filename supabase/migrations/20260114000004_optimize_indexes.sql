-- Phase 7: Hyper-Optimization (Database Indexes)
-- Adds missing indexes to the newly consolidated tables to ensure sub-100ms joins

-- 1. CRM Indexes
CREATE INDEX IF NOT EXISTS idx_crm_entities_company_id ON public.crm_entities(company_id);
CREATE INDEX IF NOT EXISTS idx_crm_entities_campaign_id ON public.crm_entities(campaign_id);
CREATE INDEX IF NOT EXISTS idx_crm_entities_owner_id ON public.crm_entities(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_entities_status ON public.crm_entities(status);
CREATE INDEX IF NOT EXISTS idx_crm_activities_entity_id ON public.crm_activities(entity_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_campaign_id ON public.crm_activities(campaign_id);

-- 2. Agent Indexes
CREATE INDEX IF NOT EXISTS idx_agent_memory_agent_id ON public.agent_memory(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_user_id ON public.agent_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_type ON public.agent_memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_assigned_agent_id ON public.agent_tasks(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON public.agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_user_id ON public.agent_tasks(user_id);

-- 3. JSONB GIN Indexes (For high-speed filtering within JSON blobs)
CREATE INDEX IF NOT EXISTS idx_crm_entities_data ON public.crm_entities USING GIN (data);
CREATE INDEX IF NOT EXISTS idx_agent_memory_content ON public.agent_memory USING GIN (content);

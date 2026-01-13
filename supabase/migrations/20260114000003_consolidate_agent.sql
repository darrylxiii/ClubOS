-- Phase 2, Step 3: Schema Consolidation (Batch 3: Agentic OS)
-- Consolidates Agent tables into unified structure
-- USES VIEWS to maintain 100% backward compatibility (Prime Directive)

-- 1. Create Unified Agent Schema

-- 1.1 Agent Registry (Consolidates registry, autonomy settings, behavior rules)
CREATE TABLE IF NOT EXISTS public.agent_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name TEXT UNIQUE NOT NULL, -- e.g. 'quin'
    display_name TEXT NOT NULL,
    description TEXT,
    capabilities TEXT[] DEFAULT '{}',
    system_prompt TEXT,
    config JSONB DEFAULT '{}'::jsonb, -- autonomy_level, active_tools
    behavior_rules JSONB DEFAULT '[]'::jsonb, -- rules, constraints
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.2 Agent Memory (Consolidates working memory, events, decisions, outcomes)
CREATE TABLE IF NOT EXISTS public.agent_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES public.agent_profiles(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    memory_type TEXT NOT NULL CHECK (memory_type IN ('working', 'episodic', 'semantic', 'procedural')),
    content JSONB NOT NULL, -- The actual memory
    context JSONB DEFAULT '{}'::jsonb, -- session_id, priority, tags
    embedding VECTOR(1536), -- Vector for semantic search
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 1.3 Agent Tasks (Consolidates goals, delegations, progress)
CREATE TABLE IF NOT EXISTS public.agent_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_task_id UUID REFERENCES public.agent_tasks(id),
    assigned_agent_id UUID REFERENCES public.agent_profiles(id),
    task_type TEXT NOT NULL, -- goal, delegation, subtask
    description TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'failed', 'paused')),
    priority INTEGER DEFAULT 5,
    result JSONB, -- Final outcome
    progress_history JSONB DEFAULT '[]'::jsonb, -- Log of actions taken
    metadata JSONB DEFAULT '{}'::jsonb, -- deadlines, constraints
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Data Migration

-- 2.1 Migrate Registry
INSERT INTO public.agent_profiles (
    id, agent_name, display_name, description, capabilities, system_prompt, config, is_active, created_at, updated_at
)
SELECT 
    id, agent_name, display_name, description, capabilities, system_prompt, 
    config || jsonb_build_object('autonomy_level', autonomy_level), 
    is_active, created_at, updated_at
FROM public.agent_registry;

-- 2.2 Migrate Goals (to Tasks)
INSERT INTO public.agent_tasks (
    id, user_id, task_type, description, status, priority, metadata, created_at, updated_at
)
SELECT 
    id, user_id, 'goal', goal_description, status, priority,
    jsonb_build_object(
        'goal_type', goal_type,
        'success_criteria', success_criteria,
        'current_progress', current_progress,
        'deadline', deadline
    ),
    created_at, updated_at
FROM public.agent_goals;


-- 3. Rename & Views (Zero Downtime)

-- 3.1 Agent Registry View
ALTER TABLE public.agent_registry RENAME TO agent_registry_legacy;

CREATE OR REPLACE VIEW public.agent_registry AS
SELECT
    id,
    agent_name,
    display_name,
    description,
    capabilities,
    (config->>'autonomy_level')::text AS autonomy_level,
    system_prompt,
    is_active,
    config,
    created_at,
    updated_at
FROM public.agent_profiles;

-- 3.2 Agent Working Memory View
ALTER TABLE public.agent_working_memory RENAME TO agent_working_memory_legacy;

CREATE OR REPLACE VIEW public.agent_working_memory AS
SELECT
    id,
    (context->>'session_id')::uuid AS session_id,
    user_id,
    'quin'::text AS agent_name, -- Default for view compatibility
    'working'::text AS context_type,
    content,
    (context->>'priority')::integer AS priority,
    expires_at,
    created_at
FROM public.agent_memory
WHERE memory_type = 'working';

-- Enable RLS
ALTER TABLE public.agent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read agents" ON public.agent_profiles FOR SELECT USING (true);
CREATE POLICY "Users view own memory" ON public.agent_memory FOR ALL USING (auth.uid() = user_id);

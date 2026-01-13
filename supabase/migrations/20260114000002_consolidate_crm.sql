-- Phase 2, Step 3: Schema Consolidation (Batch 2: CRM)
-- Consolidates CRM tables into unified structure
-- USES VIEWS to maintain 100% backward compatibility (Prime Directive)

-- 1. Create Unified CRM Schema

-- 1.1 CRM Campaigns (Consolidates active, paused, draft campaigns)
CREATE TABLE IF NOT EXISTS public.crm_campaigns_unified (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    source TEXT DEFAULT 'system',
    status TEXT DEFAULT 'draft',
    target_audience JSONB DEFAULT '{}'::jsonb, -- industry, persona
    metrics JSONB DEFAULT '{}'::jsonb, -- sent, open_rate, reply_rate
    config JSONB DEFAULT '{}'::jsonb, -- schedule, sequence steps
    owner_id UUID REFERENCES auth.users(id),
    company_id UUID REFERENCES public.companies(id),
    external_id TEXT, -- Instantly ID
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.2 CRM Entities (Consolidates prospects, contacts, leads)
CREATE TABLE IF NOT EXISTS public.crm_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('prospect', 'contact', 'lead')),
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    linkedin_url TEXT,
    company_name TEXT,
    company_id UUID REFERENCES public.companies(id),
    status TEXT DEFAULT 'new',
    lead_score INTEGER DEFAULT 0,
    owner_id UUID REFERENCES auth.users(id),
    campaign_id UUID REFERENCES public.crm_campaigns_unified(id),
    data JSONB DEFAULT '{}'::jsonb, -- dynamic attributes (job_title, location)
    engagement_metrics JSONB DEFAULT '{}'::jsonb, -- emails_sent, last_contacted
    external_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.3 CRM Activities (Consolidates touchpoints, replies, notes, tasks)
CREATE TABLE IF NOT EXISTS public.crm_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID REFERENCES public.crm_entities(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.crm_campaigns_unified(id),
    activity_type TEXT NOT NULL, -- email, call, note, reply
    direction TEXT CHECK (direction IN ('inbound', 'outbound')),
    content JSONB DEFAULT '{}'::jsonb, -- subject, body, recording_url
    ai_analysis JSONB DEFAULT '{}'::jsonb, -- sentiment, intent, summary
    metrics JSONB DEFAULT '{}'::jsonb, -- opened, clicked
    performed_by UUID REFERENCES auth.users(id), -- or NULL for system
    performed_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Data Migration

-- 2.1 Migrate Prospects
INSERT INTO public.crm_entities (
    id, entity_type, full_name, email, phone, linkedin_url, company_name, company_id,
    status, lead_score, owner_id, campaign_id, data, engagement_metrics, external_id, created_at, updated_at
)
SELECT 
    id, 'prospect', full_name, email, phone, linkedin_url, company_name, company_id,
    stage, lead_score, owner_id, campaign_id,
    jsonb_build_object(
        'job_title', job_title,
        'industry', industry,
        'location', location,
        'country', country,
        'notes', notes,
        'tags', tags
    ),
    jsonb_build_object(
        'emails_sent', emails_sent,
        'emails_opened', emails_opened,
        'last_contacted_at', last_contacted_at
    ),
    external_id, created_at, updated_at
FROM public.crm_prospects;

-- 2.2 Migrate Campaigns
INSERT INTO public.crm_campaigns_unified (
    id, name, description, source, status, target_audience, metrics, config, owner_id, company_id, external_id, created_at, updated_at
)
SELECT 
    id, name, description, source, status,
    jsonb_build_object('persona', target_persona, 'industry', target_industry),
    jsonb_build_object('sent', total_sent, 'replies', total_replies),
    jsonb_build_object('steps', sequence_steps),
    owner_id, company_id, external_id, created_at, updated_at
FROM public.crm_campaigns;

-- 3. Rename & Views (Zero Downtime)

-- 3.1 CRM Prospects View
ALTER TABLE public.crm_prospects RENAME TO crm_prospects_legacy;

CREATE OR REPLACE VIEW public.crm_prospects AS
SELECT
    id,
    (data->>'job_title')::text AS job_title,
    full_name,
    email,
    phone,
    linkedin_url,
    company_name,
    company_id,
    status AS stage,
    lead_score,
    (data->>'industry')::text AS industry,
    (data->>'location')::text AS location,
    (data->>'country')::text AS country,
    owner_id,
    campaign_id,
    external_id,
    (engagement_metrics->>'emails_sent')::integer AS emails_sent,
    (engagement_metrics->>'emails_opened')::integer AS emails_opened,
    (engagement_metrics->>'last_contacted_at')::timestamptz AS last_contacted_at,
    created_at,
    updated_at
FROM public.crm_entities
WHERE entity_type = 'prospect';

-- Enable RLS
ALTER TABLE public.crm_campaigns_unified ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;

-- Basic Admin Policies
CREATE POLICY "Admins manage crm" ON public.crm_entities
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'sales'))
    );

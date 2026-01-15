-- Phase 3: Automated Sourcing & Integration

-- 1. Candidate Raw Data (Compliance & Sourcing)
-- Stores raw JSON from external providers (LinkedIn/Proxycurl/etc.) before normalization.
-- Designed for auto-expiry (compliance).
CREATE TABLE IF NOT EXISTS public.candidate_raw_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_platform TEXT NOT NULL, -- 'linkedin', 'github', 'google_search'
    source_id TEXT, -- e.g. LinkedIn public ID or URL hash
    raw_data JSONB NOT NULL,
    search_queue_id UUID REFERENCES public.recruitment_search_queue(id),
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days') -- GDPR Compliance
);

-- Index for expiration cleanup
CREATE INDEX IF NOT EXISTS idx_candidate_raw_expires_at ON public.candidate_raw_data(expires_at);
CREATE INDEX IF NOT EXISTS idx_candidate_raw_source_id ON public.candidate_raw_data(source_id);

-- 2. Search Queue Refinements
-- Ensure we have all necessary columns for the Harvester.
-- (This might be redundant if already in 001206, but good to ensure idempotency)
ALTER TABLE public.recruitment_search_queue 
ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'linkedin',
ADD COLUMN IF NOT EXISTS query_metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS results_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS error_log TEXT;

-- 3. RLS Policies for Raw Data
ALTER TABLE public.candidate_raw_data ENABLE ROW LEVEL SECURITY;

-- Admins/Strategists can view raw data (for debugging)
CREATE POLICY "Admins can view raw candidate data" 
ON public.candidate_raw_data FOR SELECT TO authenticated 
USING (public.is_admin_or_strategist(auth.uid()));

-- Service Role has full access
CREATE POLICY "Service role manages raw candidate data" 
ON public.candidate_raw_data FOR ALL TO service_role 
USING (true) WITH CHECK (true);

-- Phase 5: Client Presentation Mode

-- 1. Create table for Shared Presentations (The "Link")
CREATE TABLE IF NOT EXISTS public.recruitment_presentations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL UNIQUE, -- The secure URL token
    expires_at TIMESTAMPTZ,
    is_blind BOOLEAN DEFAULT FALSE, -- If true, hide Name/Contact
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create table for Client Feedback
CREATE TABLE IF NOT EXISTS public.recruitment_presentation_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    presentation_id UUID REFERENCES public.recruitment_presentations(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('interested', 'rejected', 'interview_request')),
    client_comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_presentations_token ON public.recruitment_presentations(access_token);
CREATE INDEX IF NOT EXISTS idx_feedback_presentation ON public.recruitment_presentation_feedback(presentation_id);

-- 4. RLS Policies
-- Note: 'recruitment_presentations' needs to be readable by public (via Edge Function or anon key) 
-- IF we were doing direct DB access. But we will likely use an Edge Function 'proxy' to control the "Blind" logic safely.
-- However, for the Feedback table, we might want to allow inserts.

-- Let's stick to standard RLS:
ALTER TABLE public.recruitment_presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_presentation_feedback ENABLE ROW LEVEL SECURITY;

-- Admins/Recruiters can do everything
CREATE POLICY "Admins manage presentations" ON public.recruitment_presentations
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admins manage feedback" ON public.recruitment_presentation_feedback
    FOR ALL USING (auth.role() = 'authenticated');

-- Public Access (via Token) is tricky with standard RLS without a user.
-- We will handle Public Access via a separate SUPABASE FUNCTION (RPC) or EDGE FUNCTION with Service Role.
-- The Edge Function `client-presentation` will verify the token and return data.
-- So we generally don't open RLS to 'anon' for these tables directly to avoid scraping.

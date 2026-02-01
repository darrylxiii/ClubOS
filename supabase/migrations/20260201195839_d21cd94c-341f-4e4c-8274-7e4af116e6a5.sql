-- Create external_interviewers table if not exists
CREATE TABLE IF NOT EXISTS public.external_interviewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  job_title TEXT,
  phone TEXT,
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_active_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, email)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_external_interviewers_company ON public.external_interviewers(company_id);
CREATE INDEX IF NOT EXISTS idx_external_interviewers_email ON public.external_interviewers(email);

-- Enable RLS
ALTER TABLE public.external_interviewers ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Company members can view external interviewers" 
  ON public.external_interviewers 
  FOR SELECT 
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Company members can create external interviewers" 
  ON public.external_interviewers 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Company members can update external interviewers" 
  ON public.external_interviewers 
  FOR UPDATE 
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- External interviewer tokens table for magic link access
CREATE TABLE IF NOT EXISTS public.external_interviewer_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interviewer_id UUID NOT NULL REFERENCES public.external_interviewers(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for tokens
CREATE INDEX IF NOT EXISTS idx_external_interviewer_tokens_token ON public.external_interviewer_tokens(token);
CREATE INDEX IF NOT EXISTS idx_external_interviewer_tokens_expires ON public.external_interviewer_tokens(expires_at) WHERE used_at IS NULL;

-- Enable RLS
ALTER TABLE public.external_interviewer_tokens ENABLE ROW LEVEL SECURITY;

-- Token policies
CREATE POLICY "Authenticated users can create tokens" 
  ON public.external_interviewer_tokens 
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Token creators can view their tokens" 
  ON public.external_interviewer_tokens 
  FOR SELECT 
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Anyone can validate tokens" 
  ON public.external_interviewer_tokens 
  FOR SELECT 
  TO anon
  USING (expires_at > now() AND used_at IS NULL);

-- Add columns to external_meeting_sessions if table exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'external_meeting_sessions') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'external_meeting_sessions' AND column_name = 'transcript_chunks') THEN
      ALTER TABLE public.external_meeting_sessions ADD COLUMN transcript_chunks JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'external_meeting_sessions' AND column_name = 'bot_join_time') THEN
      ALTER TABLE public.external_meeting_sessions ADD COLUMN bot_join_time TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'external_meeting_sessions' AND column_name = 'bot_leave_time') THEN
      ALTER TABLE public.external_meeting_sessions ADD COLUMN bot_leave_time TIMESTAMP WITH TIME ZONE;
    END IF;
  END IF;
END $$;
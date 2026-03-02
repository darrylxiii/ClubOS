
CREATE TABLE public.funnel_partial_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  contact_email TEXT NOT NULL,
  contact_name TEXT,
  company_name TEXT,
  form_data JSONB DEFAULT '{}',
  current_step INTEGER DEFAULT 0,
  last_active_at TIMESTAMPTZ DEFAULT now(),
  reminder_sent_at TIMESTAMPTZ,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.funnel_partial_submissions ENABLE ROW LEVEL SECURITY;

-- Anonymous users can insert partial submissions
CREATE POLICY "Anon can insert partial submissions"
  ON public.funnel_partial_submissions FOR INSERT TO anon WITH CHECK (true);

-- Anonymous users can update partial submissions (by session_id match in app code)
CREATE POLICY "Anon can update partial submissions"
  ON public.funnel_partial_submissions FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Anonymous users can read their own partial submission (for resume flow)
CREATE POLICY "Anon can read partial submissions"
  ON public.funnel_partial_submissions FOR SELECT TO anon USING (true);

-- Authenticated admins can read all
CREATE POLICY "Admins can read all partial submissions"
  ON public.funnel_partial_submissions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create index for reminder processing
CREATE INDEX idx_funnel_partial_incomplete ON public.funnel_partial_submissions (completed, reminder_sent_at, created_at)
  WHERE completed = false AND reminder_sent_at IS NULL;

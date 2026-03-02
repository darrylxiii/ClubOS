
ALTER TABLE public.funnel_partial_submissions
  ADD COLUMN IF NOT EXISTS email_quality TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;


-- Create job_email_dumps table
CREATE TABLE public.job_email_dumps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  raw_content text NOT NULL,
  extracted_candidates jsonb DEFAULT '[]'::jsonb,
  import_status text NOT NULL DEFAULT 'pending',
  imported_count integer DEFAULT 0,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

-- Enable RLS
ALTER TABLE public.job_email_dumps ENABLE ROW LEVEL SECURITY;

-- RLS: Only admins and strategists can read
CREATE POLICY "Admins and strategists can view email dumps"
  ON public.job_email_dumps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'strategist')
    )
  );

-- RLS: Only admins and strategists can insert
CREATE POLICY "Admins and strategists can create email dumps"
  ON public.job_email_dumps FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'strategist')
    )
  );

-- RLS: Only admins and strategists can update
CREATE POLICY "Admins and strategists can update email dumps"
  ON public.job_email_dumps FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'strategist')
    )
  );

-- Index for fast lookups by job
CREATE INDEX idx_job_email_dumps_job_id ON public.job_email_dumps(job_id);
CREATE INDEX idx_job_email_dumps_status ON public.job_email_dumps(import_status);

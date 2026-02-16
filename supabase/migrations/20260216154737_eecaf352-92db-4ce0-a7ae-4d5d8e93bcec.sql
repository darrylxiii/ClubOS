
-- Add greenhouse_id to candidate_profiles for deduplication
ALTER TABLE public.candidate_profiles
ADD COLUMN IF NOT EXISTS greenhouse_id text;

CREATE INDEX IF NOT EXISTS idx_candidate_profiles_greenhouse_id
ON public.candidate_profiles (greenhouse_id)
WHERE greenhouse_id IS NOT NULL;

-- Create greenhouse_import_logs table
CREATE TABLE IF NOT EXISTS public.greenhouse_import_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid NOT NULL,
  job_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_candidates integer NOT NULL DEFAULT 0,
  imported_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  data_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  errors jsonb DEFAULT '[]'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.greenhouse_import_logs ENABLE ROW LEVEL SECURITY;

-- Admin-only RLS
CREATE POLICY "Admins can read greenhouse import logs"
ON public.greenhouse_import_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can insert greenhouse import logs"
ON public.greenhouse_import_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can update greenhouse import logs"
ON public.greenhouse_import_logs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

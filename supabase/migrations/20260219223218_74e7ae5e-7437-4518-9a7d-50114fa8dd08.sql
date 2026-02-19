
-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create job_pipeline_shares table
CREATE TABLE public.job_pipeline_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz NOT NULL,
  password_hash text,
  is_active boolean NOT NULL DEFAULT true,
  view_count integer NOT NULL DEFAULT 0,
  label text,
  show_candidate_names boolean NOT NULL DEFAULT true,
  show_candidate_emails boolean NOT NULL DEFAULT false,
  show_candidate_linkedin boolean NOT NULL DEFAULT false,
  show_salary_data boolean NOT NULL DEFAULT false,
  show_match_scores boolean NOT NULL DEFAULT true,
  show_ai_summary boolean NOT NULL DEFAULT true,
  show_contact_info boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_pipeline_shares ENABLE ROW LEVEL SECURITY;

-- Only admins and strategists can manage shares (using existing has_role function)
CREATE POLICY "Admins and strategists can manage pipeline shares"
  ON public.job_pipeline_shares
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'strategist'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'strategist'::app_role)
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_job_pipeline_shares_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_job_pipeline_shares_updated_at
  BEFORE UPDATE ON public.job_pipeline_shares
  FOR EACH ROW EXECUTE FUNCTION public.update_job_pipeline_shares_updated_at();

-- SECURITY DEFINER RPC: validate token and return job_id + visibility settings
-- Anonymous users can call this to validate a share link without direct table access
CREATE OR REPLACE FUNCTION public.validate_job_pipeline_share(
  _token text,
  _password text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _share public.job_pipeline_shares;
BEGIN
  SELECT * INTO _share
  FROM public.job_pipeline_shares
  WHERE token = _token
    AND is_active = true
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Check password if set
  IF _share.password_hash IS NOT NULL THEN
    IF _password IS NULL OR crypt(_password, _share.password_hash) <> _share.password_hash THEN
      RETURN jsonb_build_object('error', 'invalid_password');
    END IF;
  END IF;

  -- Increment view count
  UPDATE public.job_pipeline_shares
  SET view_count = view_count + 1, updated_at = now()
  WHERE id = _share.id;

  RETURN jsonb_build_object(
    'job_id', _share.job_id,
    'requires_password', (_share.password_hash IS NOT NULL),
    'show_candidate_names', _share.show_candidate_names,
    'show_candidate_emails', _share.show_candidate_emails,
    'show_candidate_linkedin', _share.show_candidate_linkedin,
    'show_salary_data', _share.show_salary_data,
    'show_match_scores', _share.show_match_scores,
    'show_ai_summary', _share.show_ai_summary,
    'show_contact_info', _share.show_contact_info,
    'expires_at', _share.expires_at
  );
END;
$$;

-- RPC to check if a token requires a password (before submitting password)
CREATE OR REPLACE FUNCTION public.check_pipeline_share_requires_password(
  _token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _share public.job_pipeline_shares;
BEGIN
  SELECT * INTO _share
  FROM public.job_pipeline_shares
  WHERE token = _token
    AND is_active = true
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'requires_password', (_share.password_hash IS NOT NULL)
  );
END;
$$;


-- is_password_protected column
ALTER TABLE public.job_pipeline_shares
  ADD COLUMN IF NOT EXISTS is_password_protected boolean NOT NULL DEFAULT false;

UPDATE public.job_pipeline_shares
  SET is_password_protected = (password_hash IS NOT NULL)
  WHERE is_password_protected IS DISTINCT FROM (password_hash IS NOT NULL);

-- Rate-limiting columns
ALTER TABLE public.job_pipeline_shares
  ADD COLUMN IF NOT EXISTS password_attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS password_locked_until timestamptz;

-- hash_pipeline_share_password function
CREATE OR REPLACE FUNCTION public.hash_pipeline_share_password(_password text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT extensions.crypt(_password, extensions.gen_salt('bf'));
$$;

-- get_pipeline_share_data: single SECURITY DEFINER RPC for all anonymous data access
CREATE OR REPLACE FUNCTION public.get_pipeline_share_data(
  _token text,
  _password text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _share           public.job_pipeline_shares;
  _job_title       text;
  _pipeline_stages jsonb;
  _company_name    text;
  _company_logo    text;
  _applications    jsonb;
  _now             timestamptz := now();
BEGIN
  SELECT * INTO _share
  FROM public.job_pipeline_shares
  WHERE token = _token AND is_active = true AND expires_at > _now;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_or_expired');
  END IF;

  IF _share.password_locked_until IS NOT NULL AND _share.password_locked_until > _now THEN
    RETURN jsonb_build_object(
      'error', 'too_many_attempts',
      'retry_after', EXTRACT(epoch FROM (_share.password_locked_until - _now))::int
    );
  END IF;

  IF _share.password_hash IS NOT NULL THEN
    IF _password IS NULL OR extensions.crypt(_password, _share.password_hash) <> _share.password_hash THEN
      UPDATE public.job_pipeline_shares
        SET password_attempt_count = password_attempt_count + 1,
            password_locked_until = CASE
              WHEN password_attempt_count + 1 >= 10 THEN _now + interval '15 minutes'
              ELSE NULL
            END
        WHERE id = _share.id;
      RETURN jsonb_build_object('error', 'invalid_password');
    END IF;
    UPDATE public.job_pipeline_shares
      SET password_attempt_count = 0, password_locked_until = NULL
      WHERE id = _share.id;
  END IF;

  UPDATE public.job_pipeline_shares
    SET view_count = view_count + 1, updated_at = _now
    WHERE id = _share.id;

  SELECT j.title, j.pipeline_stages::jsonb, c.name, c.logo_url
  INTO _job_title, _pipeline_stages, _company_name, _company_logo
  FROM public.jobs j
  LEFT JOIN public.companies c ON c.id = j.company_id
  WHERE j.id = _share.job_id;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id',                  a.id,
      'current_stage_index', a.current_stage_index,
      'applied_at',          a.applied_at,
      'match_score',         CASE WHEN _share.show_match_scores        THEN a.match_score       ELSE NULL END,
      'full_name',           CASE WHEN _share.show_candidate_names     THEN cp.full_name        ELSE 'Candidate' END,
      'current_title',       cp.current_title,
      'current_company',     CASE WHEN _share.show_candidate_names     THEN cp.current_company  ELSE NULL END,
      'email',               CASE WHEN _share.show_candidate_emails    THEN cp.email            ELSE NULL END,
      'linkedin_url',        CASE WHEN _share.show_candidate_linkedin  THEN cp.linkedin_url     ELSE NULL END,
      'ai_summary',          CASE WHEN _share.show_ai_summary          THEN cp.ai_summary       ELSE NULL END
    )
  )
  INTO _applications
  FROM public.applications a
  LEFT JOIN public.candidate_profiles cp ON cp.id = a.candidate_id
  WHERE a.job_id = _share.job_id
    AND COALESCE(a.status, '') <> 'rejected';

  RETURN jsonb_build_object(
    'job_id',                  _share.job_id,
    'expires_at',              _share.expires_at,
    'is_password_protected',   _share.is_password_protected,
    'show_candidate_names',    _share.show_candidate_names,
    'show_candidate_emails',   _share.show_candidate_emails,
    'show_candidate_linkedin', _share.show_candidate_linkedin,
    'show_salary_data',        _share.show_salary_data,
    'show_match_scores',       _share.show_match_scores,
    'show_ai_summary',         _share.show_ai_summary,
    'show_contact_info',       _share.show_contact_info,
    'job', jsonb_build_object(
      'title',            _job_title,
      'pipeline_stages',  _pipeline_stages,
      'company_name',     _company_name,
      'company_logo_url', _company_logo
    ),
    'applications', COALESCE(_applications, '[]'::jsonb)
  );
END;
$$;

-- Updated validate_job_pipeline_share with rate limiting
CREATE OR REPLACE FUNCTION public.validate_job_pipeline_share(
  _token text,
  _password text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _share public.job_pipeline_shares;
  _now   timestamptz := now();
BEGIN
  SELECT * INTO _share
  FROM public.job_pipeline_shares
  WHERE token = _token AND is_active = true AND expires_at > _now;

  IF NOT FOUND THEN RETURN NULL; END IF;

  IF _share.password_locked_until IS NOT NULL AND _share.password_locked_until > _now THEN
    RETURN jsonb_build_object('error', 'too_many_attempts');
  END IF;

  IF _share.password_hash IS NOT NULL THEN
    IF _password IS NULL OR extensions.crypt(_password, _share.password_hash) <> _share.password_hash THEN
      UPDATE public.job_pipeline_shares
        SET password_attempt_count = password_attempt_count + 1,
            password_locked_until = CASE WHEN password_attempt_count + 1 >= 10 THEN _now + interval '15 minutes' ELSE NULL END
        WHERE id = _share.id;
      RETURN jsonb_build_object('error', 'invalid_password');
    END IF;
    UPDATE public.job_pipeline_shares SET password_attempt_count = 0, password_locked_until = NULL WHERE id = _share.id;
  END IF;

  UPDATE public.job_pipeline_shares SET view_count = view_count + 1, updated_at = _now WHERE id = _share.id;

  RETURN jsonb_build_object(
    'job_id',                  _share.job_id,
    'is_password_protected',   _share.is_password_protected,
    'show_candidate_names',    _share.show_candidate_names,
    'show_candidate_emails',   _share.show_candidate_emails,
    'show_candidate_linkedin', _share.show_candidate_linkedin,
    'show_salary_data',        _share.show_salary_data,
    'show_match_scores',       _share.show_match_scores,
    'show_ai_summary',         _share.show_ai_summary,
    'show_contact_info',       _share.show_contact_info,
    'expires_at',              _share.expires_at
  );
END;
$$;

-- Updated check_pipeline_share_requires_password using is_password_protected
CREATE OR REPLACE FUNCTION public.check_pipeline_share_requires_password(_token text)
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
  WHERE token = _token AND is_active = true AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  RETURN jsonb_build_object('valid', true, 'requires_password', _share.is_password_protected);
END;
$$;

-- Fix Security Vulnerability in admin_add_candidate
-- Previous version lacked authorization checks inside the SECURITY DEFINER function

CREATE OR REPLACE FUNCTION public.admin_add_candidate(
  p_job_id UUID,
  p_job_title TEXT,
  p_email TEXT DEFAULT NULL,
  p_full_name TEXT DEFAULT NULL,
  p_linkedin_url TEXT DEFAULT NULL,
  p_current_company TEXT DEFAULT NULL,
  p_current_title TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_start_stage_index INTEGER DEFAULT 0,
  p_sourced_by UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidate_id UUID;
  v_application_id UUID;
  v_company_name TEXT;
  v_position TEXT;
  v_stages JSONB;
BEGIN
  -- Authorization Check
  IF NOT (
    public.is_super_admin(auth.uid()) OR 
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'recruiter') -- Assuming recruiters can also add candidates
  ) THEN
    RAISE EXCEPTION 'Access Denied: Insufficient privileges to add candidates';
  END IF;

  -- Get job details including company name
  SELECT 
    COALESCE(j.title, p_job_title, 'Untitled Position') as position,
    COALESCE(j.company_name, c.name, 'Unknown Company') as company_name,
    COALESCE(j.pipeline_stages, '[]'::jsonb) as stages
  INTO v_position, v_company_name, v_stages
  FROM jobs j
  LEFT JOIN companies c ON j.company_id = c.id
  WHERE j.id = p_job_id;
  
  -- Ensure job exists
  IF v_position IS NULL THEN
    RAISE EXCEPTION 'JOB_NOT_FOUND: %', p_job_id;
  END IF;
  
  -- Create candidate profile
  INSERT INTO candidate_profiles (
    email, full_name, linkedin_url, current_company, current_title, phone
  ) VALUES (
    p_email, p_full_name, p_linkedin_url, p_current_company, p_current_title, p_phone
  )
  RETURNING id INTO v_candidate_id;
  
  -- Create application with all required fields
  INSERT INTO applications (
    job_id, 
    candidate_id, 
    status, 
    applied_at, 
    stage,
    company_name,
    position,
    candidate_name,
    candidate_email
  ) VALUES (
    p_job_id, 
    v_candidate_id, 
    'new', 
    now(), 
    COALESCE(v_stages->0->>'id', 'new'),
    v_company_name,
    v_position,
    p_full_name,
    p_email
  )
  RETURNING id INTO v_application_id;

  -- Add interaction note if provided
  IF p_notes IS NOT NULL AND p_notes != '' THEN
    INSERT INTO candidate_interactions (
      candidate_id,
      application_id,
      type,
      content,
      created_by
    ) VALUES (
      v_candidate_id,
      v_application_id,
      'note',
      p_notes,
      COALESCE(p_sourced_by, auth.uid())
    );
  END IF;

  -- Return result
  RETURN jsonb_build_object(
    'candidate_id', v_candidate_id,
    'application_id', v_application_id
  );
END;
$$;

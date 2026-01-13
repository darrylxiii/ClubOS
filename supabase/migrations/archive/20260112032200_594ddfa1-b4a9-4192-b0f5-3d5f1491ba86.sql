-- Fix admin_add_candidate function: add candidate_interactions record for proper linking
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
    current_stage_index, 
    status, 
    sourced_by,
    source_context,
    company_name,
    position,
    stages,
    candidate_full_name,
    candidate_email,
    candidate_phone,
    candidate_title,
    candidate_company,
    candidate_linkedin_url
  ) VALUES (
    p_job_id, 
    v_candidate_id, 
    p_start_stage_index, 
    'active', 
    p_sourced_by,
    CASE WHEN p_notes IS NOT NULL THEN jsonb_build_object('notes', p_notes) ELSE NULL END,
    v_company_name,
    v_position,
    v_stages,
    p_full_name,
    p_email,
    p_phone,
    p_current_title,
    p_current_company,
    p_linkedin_url
  )
  RETURNING id INTO v_application_id;
  
  -- Create candidate_interactions record for proper linking (CRITICAL FIX)
  INSERT INTO candidate_interactions (
    candidate_id,
    application_id,
    interaction_type,
    interaction_direction,
    title,
    content,
    created_by,
    is_internal,
    visible_to_candidate,
    metadata
  ) VALUES (
    v_candidate_id,
    v_application_id,
    'status_change',
    'internal',
    'Candidate Added to Pipeline',
    COALESCE(p_notes, 'Candidate manually added by strategist'),
    p_sourced_by,
    true,
    false,
    jsonb_build_object(
      'source', 'admin_add_candidate',
      'stage_index', p_start_stage_index,
      'job_id', p_job_id
    )
  );
  
  RETURN jsonb_build_object(
    'candidate_id', v_candidate_id,
    'application_id', v_application_id
  );
END;
$$;

-- Backfill: Create missing candidate_interactions for existing applications
INSERT INTO candidate_interactions (candidate_id, application_id, interaction_type, interaction_direction, title, is_internal, visible_to_candidate, metadata)
SELECT 
  a.candidate_id, 
  a.id, 
  'status_change', 
  'internal',
  'Candidate Added to Pipeline (Backfill)', 
  true,
  false,
  jsonb_build_object('source', 'backfill', 'job_id', a.job_id)
FROM applications a
WHERE a.candidate_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM candidate_interactions ci 
    WHERE ci.application_id = a.id
  );
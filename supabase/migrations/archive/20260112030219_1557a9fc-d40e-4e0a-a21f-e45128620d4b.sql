-- Fix admin_add_candidate function: remove notes column reference, use source_context instead
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
BEGIN
  -- Create candidate profile
  INSERT INTO candidate_profiles (
    email, full_name, linkedin_url, current_company, current_title, phone
  ) VALUES (
    p_email, p_full_name, p_linkedin_url, p_current_company, p_current_title, p_phone
  )
  RETURNING id INTO v_candidate_id;
  
  -- Create application (notes stored in source_context JSONB field)
  INSERT INTO applications (
    job_id, 
    candidate_id, 
    current_stage_index, 
    status, 
    sourced_by,
    source_context,
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
    p_full_name,
    p_email,
    p_phone,
    p_current_title,
    p_current_company,
    p_linkedin_url
  )
  RETURNING id INTO v_application_id;
  
  RETURN jsonb_build_object(
    'candidate_id', v_candidate_id,
    'application_id', v_application_id
  );
END;
$$;
-- Create crm_saved_views table
CREATE TABLE IF NOT EXISTS public.crm_saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  filters JSONB DEFAULT '{}',
  sorting JSONB DEFAULT '{}',
  columns TEXT[] DEFAULT '{}',
  is_shared BOOLEAN DEFAULT false,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crm_saved_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own views or shared views"
  ON public.crm_saved_views FOR SELECT
  USING (owner_id = auth.uid() OR is_shared = true);

CREATE POLICY "Users can insert own views"
  ON public.crm_saved_views FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own views"
  ON public.crm_saved_views FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Users can delete own views"
  ON public.crm_saved_views FOR DELETE
  USING (owner_id = auth.uid());

-- Create admin_add_candidate RPC function
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
  
  -- Create application
  INSERT INTO applications (
    job_id, candidate_id, current_stage_index, status, notes, sourced_by
  ) VALUES (
    p_job_id, v_candidate_id, p_start_stage_index, 'active', p_notes, p_sourced_by
  )
  RETURNING id INTO v_application_id;
  
  RETURN jsonb_build_object(
    'candidate_id', v_candidate_id,
    'application_id', v_application_id
  );
END;
$$;
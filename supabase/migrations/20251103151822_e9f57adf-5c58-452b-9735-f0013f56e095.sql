-- Phase 1: Create unified candidate view and helper functions

-- 1.1 Create unified view combining candidate_profiles + profiles data
CREATE OR REPLACE VIEW unified_candidate_view AS
SELECT 
  cp.id as candidate_id,
  cp.user_id,
  cp.email as candidate_email,
  cp.full_name as candidate_full_name,
  cp.avatar_url as candidate_avatar,
  cp.current_title,
  cp.current_company,
  cp.years_of_experience,
  cp.linkedin_url,
  cp.github_url,
  cp.portfolio_url,
  cp.skills as candidate_skills,
  cp.languages,
  cp.certifications,
  cp.education,
  cp.work_history,
  cp.desired_salary_min as cp_desired_salary_min,
  cp.desired_salary_max as cp_desired_salary_max,
  cp.preferred_currency as cp_preferred_currency,
  cp.desired_locations,
  cp.remote_preference as cp_remote_preference,
  cp.notice_period as cp_notice_period,
  cp.work_authorization,
  cp.source_channel,
  cp.tags,
  cp.internal_rating,
  cp.fit_score,
  cp.engagement_score,
  cp.ai_summary,
  cp.profile_completeness,
  cp.invitation_status,
  cp.merged_at,
  cp.assigned_strategist_id,
  cp.created_at as candidate_created_at,
  
  -- User profile data (from Settings page)
  p.id as profile_id,
  p.email as profile_email,
  p.full_name as profile_full_name,
  p.avatar_url as profile_avatar,
  p.phone,
  p.location,
  p.current_title as profile_current_title,
  p.linkedin_url as profile_linkedin,
  p.resume_url,
  p.current_salary_min,
  p.current_salary_max,
  p.desired_salary_min as p_desired_salary_min,
  p.desired_salary_max as p_desired_salary_max,
  p.preferred_currency as p_preferred_currency,
  p.preferred_work_locations,
  p.remote_work_preference,
  p.employment_type_preference,
  p.freelance_hourly_rate_min,
  p.freelance_hourly_rate_max,
  p.fulltime_hours_per_week_min,
  p.fulltime_hours_per_week_max,
  p.freelance_hours_per_week_min,
  p.freelance_hours_per_week_max,
  p.notice_period as p_notice_period,
  p.contract_end_date,
  p.has_indefinite_contract,
  p.phone_verified,
  p.email_verified,
  p.linkedin_connected,
  p.github_connected,
  p.header_media_url,
  p.header_media_type,
  p.profile_slug,
  p.stealth_mode_enabled,
  p.privacy_settings,
  p.public_fields,
  p.created_at as profile_created_at,
  
  -- Computed fields
  COALESCE(p.full_name, cp.full_name) as display_name,
  COALESCE(p.email, cp.email) as display_email,
  COALESCE(p.avatar_url, cp.avatar_url) as display_avatar,
  COALESCE(p.desired_salary_min, cp.desired_salary_min) as final_desired_salary_min,
  COALESCE(p.desired_salary_max, cp.desired_salary_max) as final_desired_salary_max,
  COALESCE(p.preferred_currency, cp.preferred_currency, 'USD') as final_currency,
  COALESCE(p.notice_period, cp.notice_period) as final_notice_period,
  
  -- Merge status
  CASE 
    WHEN cp.user_id IS NOT NULL THEN 'merged'
    WHEN cp.invitation_status = 'pending' THEN 'invited'
    WHEN cp.invitation_status = 'registered' THEN 'registered'
    ELSE 'unlinked'
  END as merge_status,
  
  -- Data completeness score (0-100)
  (
    CASE WHEN cp.full_name IS NOT NULL THEN 5 ELSE 0 END +
    CASE WHEN cp.email IS NOT NULL THEN 5 ELSE 0 END +
    CASE WHEN cp.linkedin_url IS NOT NULL THEN 5 ELSE 0 END +
    CASE WHEN cp.skills IS NOT NULL AND jsonb_array_length(cp.skills) > 0 THEN 10 ELSE 0 END +
    CASE WHEN cp.current_title IS NOT NULL THEN 5 ELSE 0 END +
    CASE WHEN cp.years_of_experience IS NOT NULL THEN 5 ELSE 0 END +
    CASE WHEN COALESCE(p.desired_salary_min, cp.desired_salary_min) IS NOT NULL THEN 10 ELSE 0 END +
    CASE WHEN p.resume_url IS NOT NULL THEN 15 ELSE 0 END +
    CASE WHEN p.phone IS NOT NULL THEN 5 ELSE 0 END +
    CASE WHEN p.current_salary_min IS NOT NULL THEN 10 ELSE 0 END +
    CASE WHEN p.employment_type_preference IS NOT NULL THEN 10 ELSE 0 END +
    CASE WHEN p.preferred_work_locations IS NOT NULL AND jsonb_array_length(p.preferred_work_locations) > 0 THEN 10 ELSE 0 END +
    CASE WHEN cp.user_id IS NOT NULL THEN 5 ELSE 0 END
  ) as data_completeness_score

FROM candidate_profiles cp
LEFT JOIN profiles p ON cp.user_id = p.id;

-- Grant access to authenticated users
GRANT SELECT ON unified_candidate_view TO authenticated;

COMMENT ON VIEW unified_candidate_view IS 
'Unified view combining candidate_profiles (admin-created) and profiles (user-entered settings). Prioritizes profile data when both exist.';

-- 1.2 Create helper function for complete candidate data access
CREATE OR REPLACE FUNCTION get_candidate_complete_data(
  p_candidate_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  -- Only admins and strategists can call this
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'strategist'::app_role)
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins and strategists can access complete candidate data';
  END IF;

  SELECT json_build_object(
    'candidate', row_to_json(cp.*),
    'profile', row_to_json(p.*),
    'documents', (
      SELECT json_agg(d.*) FROM candidate_documents d WHERE d.candidate_id = p_candidate_id
    ),
    'applications', (
      SELECT json_agg(json_build_object(
        'id', a.id,
        'job_id', a.job_id,
        'status', a.status,
        'applied_at', a.applied_at,
        'job_title', j.title,
        'company_name', j.company_name
      ))
      FROM applications a
      LEFT JOIN jobs j ON a.job_id = j.id
      WHERE a.candidate_id = p_candidate_id OR (cp.user_id IS NOT NULL AND a.user_id = cp.user_id)
    ),
    'interactions', (
      SELECT json_agg(ci.* ORDER BY ci.created_at DESC)
      FROM candidate_interactions ci
      WHERE ci.candidate_id = p_candidate_id
      LIMIT 20
    )
  ) INTO result
  FROM candidate_profiles cp
  LEFT JOIN profiles p ON cp.user_id = p.id
  WHERE cp.id = p_candidate_id;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_candidate_complete_data(uuid) IS 
'Returns complete candidate data including profile, documents, applications, and interactions. Admin/Strategist only.';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_user_id ON candidate_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_assigned_strategist ON candidate_profiles(assigned_strategist_id);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_invitation_status ON candidate_profiles(invitation_status);
CREATE INDEX IF NOT EXISTS idx_applications_candidate_id ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
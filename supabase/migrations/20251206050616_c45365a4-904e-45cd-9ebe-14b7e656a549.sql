-- Fix Deal Pipeline database functions - drop and recreate with correct signatures

-- Drop the function first since return type is changing
DROP FUNCTION IF EXISTS public.get_pipeline_candidate_stats(uuid);

-- Recreate get_pipeline_candidate_stats with correct column references
CREATE OR REPLACE FUNCTION public.get_pipeline_candidate_stats(p_job_id uuid)
RETURNS TABLE(
  total_candidates bigint,
  avg_experience_years numeric,
  avg_current_salary numeric,
  avg_desired_salary numeric,
  skill_match_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT a.candidate_id)::bigint as total_candidates,
    COALESCE(AVG(cp.years_of_experience), 0)::numeric as avg_experience_years,
    COALESCE(AVG(cp.current_salary_min), 0)::numeric as avg_current_salary,
    COALESCE(AVG(cp.desired_salary_min), 0)::numeric as avg_desired_salary,
    COALESCE(AVG(a.match_score), 0)::numeric as skill_match_rate
  FROM applications a
  LEFT JOIN candidate_profiles cp ON a.candidate_id = cp.id
  WHERE a.job_id = p_job_id
    AND a.status NOT IN ('rejected', 'withdrawn');
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_pipeline_candidate_stats(uuid) TO authenticated;
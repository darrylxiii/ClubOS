
CREATE OR REPLACE FUNCTION public.get_pipeline_candidate_stats_batch(p_job_ids uuid[])
RETURNS TABLE(
  job_id uuid,
  avg_desired_salary numeric,
  avg_current_salary numeric,
  candidate_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.job_id,
    COALESCE(AVG(cp.desired_salary_min), 0)::numeric AS avg_desired_salary,
    COALESCE(AVG(cp.current_salary_min), 0)::numeric AS avg_current_salary,
    COUNT(DISTINCT cp.id) AS candidate_count
  FROM applications a
  LEFT JOIN candidate_profiles cp ON cp.id = a.candidate_id
  WHERE a.job_id = ANY(p_job_ids)
    AND a.status NOT IN ('rejected', 'withdrawn', 'closed')
  GROUP BY a.job_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_pipeline_candidate_stats_batch(uuid[]) TO authenticated;

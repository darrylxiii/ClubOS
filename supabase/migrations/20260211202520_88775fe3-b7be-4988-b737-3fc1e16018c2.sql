
-- Phase 4: Demand Trend & Completeness Audit

-- 1. Create demand trend aggregation function
CREATE OR REPLACE FUNCTION public.aggregate_skill_demand()
RETURNS TABLE(skill_name text, demand_score integer, job_count integer)
LANGUAGE sql
STABLE
AS $$
  SELECT
    ps.skill_name,
    COUNT(DISTINCT j.id)::integer as demand_score,
    COUNT(DISTINCT j.id)::integer as job_count
  FROM profile_skills ps
  LEFT JOIN jobs j ON j.status = 'open'
  WHERE j.id IS NOT NULL
  GROUP BY ps.skill_name
  ORDER BY demand_score DESC;
$$;

-- 2. Create completeness audit table
CREATE TABLE IF NOT EXISTS public.candidate_completeness_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  completeness_score integer NOT NULL,
  populated_fields text[] NOT NULL,
  missing_fields text[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.candidate_completeness_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit history"
ON public.candidate_completeness_audit FOR SELECT
USING ((SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin');

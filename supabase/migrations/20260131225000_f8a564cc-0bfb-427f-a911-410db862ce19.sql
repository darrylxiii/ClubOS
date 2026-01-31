
-- Fix the application_status_public view to include all required columns from profiles

DROP VIEW IF EXISTS public.application_status_public;

CREATE VIEW public.application_status_public 
WITH (security_invoker = on)
AS
SELECT 
  a.id,
  a.status,
  a.stages,
  a.updated_at,
  a.created_at,
  j.title as job_title,
  c.name as company_name,
  c.logo_url as company_logo,
  cp.full_name,
  p.account_status,
  p.account_decline_reason,
  p.application_access_token
FROM applications a
LEFT JOIN jobs j ON a.job_id = j.id
LEFT JOIN companies c ON j.company_id = c.id
LEFT JOIN candidate_profiles cp ON a.candidate_id = cp.id
LEFT JOIN profiles p ON cp.user_id = p.id;

GRANT SELECT ON public.application_status_public TO authenticated;
GRANT SELECT ON public.application_status_public TO anon;

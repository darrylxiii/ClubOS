-- Trigger function and trigger
CREATE OR REPLACE FUNCTION public.validate_candidate_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.account_status = 'approved' AND (OLD.account_status IS DISTINCT FROM 'approved') THEN
    IF public.is_pure_candidate(NEW.id) THEN
      IF NEW.onboarding_completed_at IS NULL THEN
        RAISE EXCEPTION 'Candidates must complete onboarding before approval';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_candidate_approval ON public.profiles;
CREATE TRIGGER trg_validate_candidate_approval
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_candidate_approval();

-- Recreate view with role filter on candidate branch
CREATE OR REPLACE VIEW public.member_requests_unified AS
SELECT
  p.id,
  'candidate'::text AS request_type,
  p.full_name AS name,
  p.email,
  p.phone,
  p.current_title AS title_or_company,
  p.location,
  p.desired_salary_min,
  p.desired_salary_max,
  p.resume_url,
  p.linkedin_url,
  p.account_status AS status,
  p.created_at,
  p.account_reviewed_at AS reviewed_at,
  p.account_approved_by AS reviewed_by,
  p.account_decline_reason AS decline_reason,
  p.assigned_strategist_id AS assigned_to,
  NULL::jsonb AS additional_data
FROM public.profiles p
WHERE p.created_at > '2025-01-01 00:00:00+00'::timestamp with time zone
  AND public.is_pure_candidate(p.id)
UNION ALL
SELECT
  pr.id,
  'partner'::text AS request_type,
  pr.contact_name AS name,
  pr.contact_email AS email,
  pr.contact_phone AS phone,
  pr.company_name AS title_or_company,
  pr.headquarters_location AS location,
  NULL::integer AS desired_salary_min,
  NULL::integer AS desired_salary_max,
  NULL::text AS resume_url,
  pr.linkedin_url,
  pr.status,
  pr.created_at,
  pr.reviewed_at,
  pr.reviewed_by,
  pr.decline_reason,
  pr.assigned_to,
  jsonb_build_object('company_size', pr.company_size, 'industry', pr.industry, 'budget_range', pr.budget_range, 'estimated_roles_per_year', pr.estimated_roles_per_year, 'website', pr.website) AS additional_data
FROM public.partner_requests pr;
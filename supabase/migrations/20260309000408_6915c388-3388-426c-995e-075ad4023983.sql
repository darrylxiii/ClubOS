
-- Fix 1: Tighten review_feedback_aggregates RLS (drop permissive, add role-restricted)
DROP POLICY IF EXISTS "Authenticated users can read review aggregates" ON public.review_feedback_aggregates;

CREATE POLICY "Admin strategist partner can read review aggregates"
ON public.review_feedback_aggregates
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'strategist') OR
  public.has_role(auth.uid(), 'partner')
);

-- Fix 2: Set search_path on trigger function
CREATE OR REPLACE FUNCTION public.update_review_aggregates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id uuid;
  v_company_id uuid;
BEGIN
  v_job_id := COALESCE(NEW.job_id, OLD.job_id);

  SELECT company_id INTO v_company_id
  FROM public.jobs
  WHERE id = v_job_id;

  -- Aggregate for this job
  INSERT INTO public.review_feedback_aggregates (job_id, company_id, total_reviewed, total_approved, total_rejected, total_hold, avg_partner_rating)
  SELECT
    v_job_id,
    v_company_id,
    COUNT(*) FILTER (WHERE partner_review_status IS NOT NULL AND partner_review_status != 'pending'),
    COUNT(*) FILTER (WHERE partner_review_status = 'approved'),
    COUNT(*) FILTER (WHERE partner_review_status = 'rejected'),
    COUNT(*) FILTER (WHERE partner_review_status = 'hold'),
    AVG(partner_review_rating) FILTER (WHERE partner_review_rating IS NOT NULL)
  FROM public.applications
  WHERE job_id = v_job_id
  ON CONFLICT (job_id) DO UPDATE SET
    company_id = EXCLUDED.company_id,
    total_reviewed = EXCLUDED.total_reviewed,
    total_approved = EXCLUDED.total_approved,
    total_rejected = EXCLUDED.total_rejected,
    total_hold = EXCLUDED.total_hold,
    avg_partner_rating = EXCLUDED.avg_partner_rating,
    updated_at = now();

  RETURN NEW;
END;
$$;

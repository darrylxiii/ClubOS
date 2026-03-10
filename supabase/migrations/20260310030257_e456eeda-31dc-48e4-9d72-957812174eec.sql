CREATE OR REPLACE FUNCTION public.update_review_aggregates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id uuid;
BEGIN
  v_job_id := COALESCE(NEW.job_id, OLD.job_id);

  INSERT INTO public.review_feedback_aggregates (entity_type, entity_id, total_approved, total_rejected, total_hold, avg_rating)
  SELECT
    'job',
    v_job_id,
    COUNT(*) FILTER (WHERE partner_review_status = 'approved'),
    COUNT(*) FILTER (WHERE partner_review_status = 'rejected'),
    COUNT(*) FILTER (WHERE partner_review_status = 'hold'),
    AVG(partner_review_rating) FILTER (WHERE partner_review_rating IS NOT NULL)
  FROM public.applications
  WHERE job_id = v_job_id
  ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    total_approved = EXCLUDED.total_approved,
    total_rejected = EXCLUDED.total_rejected,
    total_hold = EXCLUDED.total_hold,
    avg_rating = EXCLUDED.avg_rating,
    updated_at = now();

  RETURN NEW;
END;
$$;
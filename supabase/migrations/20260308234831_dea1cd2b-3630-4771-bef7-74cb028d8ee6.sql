DROP TRIGGER IF EXISTS trg_update_review_aggregates ON public.applications;

CREATE TRIGGER trg_update_review_aggregates
AFTER UPDATE OF partner_review_status, partner_review_rating, partner_reviewed_at
ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.update_review_aggregates();
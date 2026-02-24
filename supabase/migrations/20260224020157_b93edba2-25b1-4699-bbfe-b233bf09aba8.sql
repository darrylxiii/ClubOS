-- 1. Expand status check to include 'superseded'
ALTER TABLE public.partner_requests DROP CONSTRAINT partner_requests_status_check;
ALTER TABLE public.partner_requests ADD CONSTRAINT partner_requests_status_check
  CHECK (status = ANY (ARRAY['pending','approved','declined','in_progress','completed','superseded']));

-- 2. Dedup: keep newest pending per email, mark older as superseded
UPDATE partner_requests
SET status = 'superseded'
WHERE status = 'pending'
  AND id NOT IN (
    SELECT DISTINCT ON (contact_email) id
    FROM partner_requests
    WHERE status = 'pending'
    ORDER BY contact_email, created_at DESC
  );

-- 3. Create partial unique index to prevent future duplicates
CREATE UNIQUE INDEX idx_partner_requests_pending_email
ON public.partner_requests (contact_email)
WHERE status = 'pending';
ALTER TABLE public.jobs DROP CONSTRAINT jobs_status_check;

ALTER TABLE public.jobs ADD CONSTRAINT jobs_status_check
  CHECK (status = ANY (ARRAY[
    'draft'::text,
    'published'::text,
    'closed'::text,
    'archived'::text,
    'pending_approval'::text
  ]));
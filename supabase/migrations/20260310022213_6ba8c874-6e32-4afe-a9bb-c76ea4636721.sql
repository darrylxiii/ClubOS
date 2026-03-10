
CREATE TABLE public.review_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID NOT NULL,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  review_type TEXT NOT NULL DEFAULT 'partner',
  notification_type TEXT NOT NULL DEFAULT 'review_ready',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.review_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own review notifications"
ON public.review_notifications FOR SELECT TO authenticated
USING (reviewer_id = auth.uid());

CREATE POLICY "Users can update own review notifications"
ON public.review_notifications FOR UPDATE TO authenticated
USING (reviewer_id = auth.uid());

CREATE POLICY "Admins strategists recruiters can insert review notifications"
ON public.review_notifications FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'strategist'::app_role) OR
  public.has_role(auth.uid(), 'recruiter'::app_role)
);

CREATE INDEX idx_review_notifications_reviewer ON public.review_notifications(reviewer_id, read_at);
CREATE INDEX idx_review_notifications_job ON public.review_notifications(job_id);

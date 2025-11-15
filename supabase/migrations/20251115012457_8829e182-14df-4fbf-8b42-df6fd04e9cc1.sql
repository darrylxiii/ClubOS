-- Add RLS policy for email_learning_queue management
CREATE POLICY "Admins can manage email learning queue"
ON email_learning_queue FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
);
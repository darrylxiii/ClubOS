
-- Data Room Access Logs for due diligence audit trail
CREATE TABLE public.data_room_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES public.data_room_documents(id) ON DELETE CASCADE,
  user_id UUID,
  action TEXT NOT NULL DEFAULT 'view',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.data_room_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view access logs"
  ON public.data_room_access_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Authenticated users can insert access logs"
  ON public.data_room_access_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_data_room_access_logs_document ON public.data_room_access_logs(document_id);
CREATE INDEX idx_data_room_access_logs_created ON public.data_room_access_logs(created_at DESC);

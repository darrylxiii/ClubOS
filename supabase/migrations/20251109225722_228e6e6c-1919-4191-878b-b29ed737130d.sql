-- Allow admins/partners/strategists to upload candidate documents to resumes bucket
CREATE POLICY "Admin/Partner can upload candidate resumes"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'resumes' AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'partner', 'strategist')
    )
  );

-- Allow admins/partners/strategists to view candidate documents
CREATE POLICY "Admin/Partner can view candidate resumes"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'resumes' AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'partner', 'strategist')
    )
  );

-- Allow admins/partners/strategists to delete candidate documents
CREATE POLICY "Admin/Partner can delete candidate resumes"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'resumes' AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'partner', 'strategist')
    )
  );
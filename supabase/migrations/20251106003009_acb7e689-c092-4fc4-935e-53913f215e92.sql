-- Allow anonymous uploads to onboarding folder in resumes bucket
CREATE POLICY "Allow anonymous resume uploads for onboarding"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'resumes' AND
    (storage.foldername(name))[1] = 'onboarding'
  );

-- Allow anonymous users to read onboarding resumes temporarily
CREATE POLICY "Allow anonymous to read onboarding resumes"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'resumes' AND
    (storage.foldername(name))[1] = 'onboarding'
  );

-- Allow authenticated users to move files from onboarding to their folder
CREATE POLICY "Allow users to move resumes from onboarding"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'resumes' AND
    (
      (storage.foldername(name))[1] = 'onboarding' OR
      (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- Fix #1: Anonymous resume uploads - restrict to service_role only
DROP POLICY IF EXISTS "Allow anonymous resume uploads for onboarding" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous to read onboarding resumes" ON storage.objects;

CREATE POLICY "Service role can upload onboarding resumes"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'resumes' AND
    (storage.foldername(name))[1] = 'onboarding' AND
    auth.role() = 'service_role'
  );

CREATE POLICY "Service role can read onboarding resumes"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'resumes' AND
    (storage.foldername(name))[1] = 'onboarding' AND
    auth.role() = 'service_role'
  );

-- Fix #2: Consent receipts - restrict INSERT to service_role, make immutable
DROP POLICY IF EXISTS "Users can insert their own consent receipts" ON public.consent_receipts;
DROP POLICY IF EXISTS "Users can update their own consent receipts" ON public.consent_receipts;

CREATE POLICY "Service role can insert consent receipts"
  ON public.consent_receipts FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Consent receipts are immutable - no updates allowed"
  ON public.consent_receipts FOR UPDATE
  USING (false);

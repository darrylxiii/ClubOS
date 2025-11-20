-- Phase 1: Fix Storage Policies for profile-headers bucket
-- Drop conflicting policies that prevent company uploads
DROP POLICY IF EXISTS "Users can upload their own profile headers" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile headers" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile headers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload company covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update company covers" ON storage.objects;

-- Create unified policies that allow both user folders AND company files
-- SELECT: Public read access
CREATE POLICY "profile_headers_public_select"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-headers');

-- INSERT: Allow user folders ({user_id}/) AND company files ({uuid}-cover.ext or {uuid}-logo.ext)
CREATE POLICY "profile_headers_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-headers' 
  AND (
    -- User's own folder: {user_id}/filename
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Company files: {uuid}-cover.ext or {uuid}-logo.ext
    name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-(cover|logo)\.'
  )
);

-- UPDATE: Same logic as INSERT
CREATE POLICY "profile_headers_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-headers'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-(cover|logo)\.'
  )
);

-- DELETE: Same logic as INSERT
CREATE POLICY "profile_headers_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-headers'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-(cover|logo)\.'
  )
);

-- Phase 2: Ensure index exists for query performance
CREATE INDEX IF NOT EXISTS idx_company_members_user_id 
ON public.company_members(user_id);
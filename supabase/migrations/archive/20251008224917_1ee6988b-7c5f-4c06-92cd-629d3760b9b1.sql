-- Fix storage RLS policies for company logo and cover uploads
-- Allow authenticated users to upload to avatars bucket (for company logos)
CREATE POLICY "Authenticated users can upload company logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
  OR bucket_id = 'avatars'
);

CREATE POLICY "Authenticated users can update company logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

-- Allow authenticated users to upload to profile-headers bucket (for company covers)
CREATE POLICY "Authenticated users can upload company covers"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-headers');

CREATE POLICY "Authenticated users can update company covers"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-headers')
WITH CHECK (bucket_id = 'profile-headers');
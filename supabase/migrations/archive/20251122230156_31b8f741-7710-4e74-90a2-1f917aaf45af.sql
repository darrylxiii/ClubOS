-- Fix avatar upload RLS policies for proper user folder enforcement

-- Drop the existing permissive INSERT policy
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;

-- Create a stricter INSERT policy that enforces user folder structure
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'avatars' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Ensure UPDATE policy exists correctly (should already be there but let's make sure)
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
TO public
USING (
  bucket_id = 'avatars' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Ensure DELETE policy exists correctly
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
TO public
USING (
  bucket_id = 'avatars' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Keep the public SELECT policy for viewing avatars
-- This should already exist but let's ensure it's there
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');
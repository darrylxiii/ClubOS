-- Fix infinite recursion in storage policies by using SECURITY DEFINER function

-- Create a safe function to check upload rate limits without self-referencing
CREATE OR REPLACE FUNCTION public.check_storage_upload_rate_limit(
  p_bucket_id TEXT,
  p_max_uploads INTEGER,
  p_window_interval INTERVAL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  RETURN (
    SELECT count(*) < p_max_uploads
    FROM storage.objects
    WHERE bucket_id = p_bucket_id
    AND owner = auth.uid()
    AND created_at > (now() - p_window_interval)
  );
END;
$$;

-- Drop the problematic self-referencing policies that cause infinite recursion
DROP POLICY IF EXISTS "Rate limit post media uploads" ON storage.objects;
DROP POLICY IF EXISTS "Rate limit stories uploads" ON storage.objects;

-- Recreate policies using the safe SECURITY DEFINER function
-- Only create if the buckets exist and need rate limiting
DO $$
BEGIN
  -- Check if post-media bucket exists before creating policy
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'post-media') THEN
    CREATE POLICY "Rate limit post media uploads" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id != 'post-media' 
      OR (
        auth.role() = 'authenticated'
        AND public.check_storage_upload_rate_limit('post-media', 50, INTERVAL '1 hour')
      )
    );
  END IF;
  
  -- Check if stories bucket exists before creating policy
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'stories') THEN
    CREATE POLICY "Rate limit stories uploads" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id != 'stories' 
      OR (
        auth.role() = 'authenticated'
        AND public.check_storage_upload_rate_limit('stories', 30, INTERVAL '1 hour')
      )
    );
  END IF;
END $$;
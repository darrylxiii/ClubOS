-- Fix search_path for get_storage_bucket_stats function
CREATE OR REPLACE FUNCTION get_storage_bucket_stats()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, storage
AS $$
  SELECT jsonb_build_object(
    'total_buckets', COUNT(*),
    'public_buckets', COUNT(*) FILTER (WHERE public = true),
    'private_buckets', COUNT(*) FILTER (WHERE public = false),
    'with_size_limits', COUNT(*) FILTER (WHERE file_size_limit IS NOT NULL),
    'with_mime_restrictions', COUNT(*) FILTER (WHERE allowed_mime_types IS NOT NULL)
  )
  FROM storage.buckets;
$$;
-- Add rate limiting for storage uploads to prevent abuse
-- Drop existing policies first
DROP POLICY IF EXISTS "Authenticated users can upload post media" ON storage.objects;
DROP POLICY IF EXISTS "Rate limit uploads" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view post media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload stories" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view stories" ON storage.objects;

-- Limit post-media uploads to 50 per hour per user
CREATE POLICY "Rate limit post media uploads"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'post-media' AND
  auth.role() = 'authenticated' AND
  (
    SELECT COUNT(*) FROM storage.objects
    WHERE bucket_id = 'post-media'
    AND owner = auth.uid()
    AND created_at > NOW() - INTERVAL '1 hour'
  ) < 50
);

-- Limit stories uploads to 30 per hour per user
CREATE POLICY "Rate limit stories uploads"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'stories' AND
  auth.role() = 'authenticated' AND
  (
    SELECT COUNT(*) FROM storage.objects
    WHERE bucket_id = 'stories'
    AND owner = auth.uid()
    AND created_at > NOW() - INTERVAL '1 hour'
  ) < 30
);

-- Re-create select policies for public access
CREATE POLICY "Anyone can view post media"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-media');

CREATE POLICY "Anyone can view stories"
ON storage.objects FOR SELECT
USING (bucket_id = 'stories');
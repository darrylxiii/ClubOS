-- Add image_url field to modules table
ALTER TABLE public.modules 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create storage bucket for module media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'module-media',
  'module-media',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for module-media bucket
-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload module media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'module-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update their module media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'module-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete their module media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'module-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to all module media (since bucket is public)
CREATE POLICY "Public read access to module media"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'module-media');
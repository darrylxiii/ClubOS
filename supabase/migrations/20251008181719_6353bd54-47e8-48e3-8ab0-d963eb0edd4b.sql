-- Add header/wallpaper media columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS header_media_url TEXT,
ADD COLUMN IF NOT EXISTS header_media_type TEXT CHECK (header_media_type IN ('image', 'video'));

-- Create storage bucket for profile headers
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-headers', 'profile-headers', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for profile-headers bucket
CREATE POLICY "Users can upload their own profile headers"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-headers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own profile headers"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-headers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own profile headers"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-headers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Profile headers are publicly viewable"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-headers');
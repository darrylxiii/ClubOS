-- Add file size limits and MIME type restrictions to storage buckets
-- This enforces server-side validation matching existing client-side checks

-- Avatars: Images only, 5MB max
UPDATE storage.buckets 
SET 
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
WHERE id = 'avatars';

-- Resumes: Documents only, 10MB max
UPDATE storage.buckets 
SET 
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
WHERE id = 'resumes';

-- Job Documents: Images, videos, documents, 50MB max
UPDATE storage.buckets 
SET 
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime',
    'application/pdf', 'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
WHERE id = 'job-documents';
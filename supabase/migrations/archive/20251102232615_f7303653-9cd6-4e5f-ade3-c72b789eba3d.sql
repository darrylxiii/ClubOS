-- Create storage bucket for email attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'email-attachments',
  'email-attachments',
  false,
  10485760, -- 10MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/zip'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for email-attachments bucket

-- Users can upload their own attachments
CREATE POLICY "Users can upload their own email attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'email-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can read their own attachments
CREATE POLICY "Users can view their own email attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'email-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own attachments
CREATE POLICY "Users can delete their own email attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'email-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
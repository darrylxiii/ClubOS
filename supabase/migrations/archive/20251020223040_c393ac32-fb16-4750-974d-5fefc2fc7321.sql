-- Add file storage columns to jobs table
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS job_description_url TEXT,
ADD COLUMN IF NOT EXISTS supporting_documents JSONB DEFAULT '[]'::jsonb;

-- Create storage bucket for job documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-documents', 'job-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for job-documents bucket
CREATE POLICY "Authenticated users can upload job documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'job-documents');

CREATE POLICY "Users can view job documents they have access to"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'job-documents');

CREATE POLICY "Users can update their job documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'job-documents');

CREATE POLICY "Users can delete their job documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'job-documents');
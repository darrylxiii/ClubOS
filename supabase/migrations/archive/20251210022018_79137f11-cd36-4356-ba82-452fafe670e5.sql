-- Add columns to track who uploaded the job description (separate from job creator)
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS jd_uploaded_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS jd_uploaded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS jd_uploader_name TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_jobs_jd_uploaded_by ON public.jobs(jd_uploaded_by);
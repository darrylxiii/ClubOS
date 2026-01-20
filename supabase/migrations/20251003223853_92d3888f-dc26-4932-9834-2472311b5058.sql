-- Modify target_companies table to link to actual jobs instead of freeform text
-- Add job_id column and remove job_specifications
ALTER TABLE public.target_companies 
ADD COLUMN job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX idx_target_companies_job_id ON public.target_companies(job_id);

-- Note: We keep job_specifications for backward compatibility but will phase it out
-- Later we can drop it: ALTER TABLE public.target_companies DROP COLUMN job_specifications;
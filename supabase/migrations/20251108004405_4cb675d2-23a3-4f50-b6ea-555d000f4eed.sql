-- Create missing foreign key constraints on applications table

-- 1. Foreign key to candidate_profiles
ALTER TABLE public.applications
ADD CONSTRAINT applications_candidate_id_fkey
FOREIGN KEY (candidate_id)
REFERENCES public.candidate_profiles(id)
ON DELETE SET NULL;

-- 2. Foreign key to jobs (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'applications_job_id_fkey' 
        AND table_name = 'applications'
    ) THEN
        ALTER TABLE public.applications
        ADD CONSTRAINT applications_job_id_fkey
        FOREIGN KEY (job_id)
        REFERENCES public.jobs(id)
        ON DELETE CASCADE;
    END IF;
END $$;
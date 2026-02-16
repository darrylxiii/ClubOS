-- Add greenhouse_job_id to jobs table for Greenhouse pipeline linking
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS greenhouse_job_id TEXT;
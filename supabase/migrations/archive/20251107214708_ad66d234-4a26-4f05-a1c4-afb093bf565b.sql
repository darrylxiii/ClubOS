-- Phase 1: Fix Critical Bugs - Database Schema

-- 1. Add club_sync_enabled column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS club_sync_enabled BOOLEAN DEFAULT false;

-- 2. Create saved_jobs table for persistence
CREATE TABLE IF NOT EXISTS public.saved_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, job_id)
);

-- Enable RLS for saved_jobs
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for saved_jobs
CREATE POLICY "Users can view their own saved jobs"
ON public.saved_jobs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can save jobs"
ON public.saved_jobs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave jobs"
ON public.saved_jobs
FOR DELETE
USING (auth.uid() = user_id);

-- 3. Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON public.saved_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_job_id ON public.saved_jobs(job_id);

-- 4. Add user profile fields for better match scoring context
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS years_of_experience INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS preferred_job_types TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS preferred_locations TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS salary_expectation_min INTEGER,
ADD COLUMN IF NOT EXISTS salary_expectation_max INTEGER,
ADD COLUMN IF NOT EXISTS salary_expectation_currency TEXT DEFAULT 'EUR';

COMMENT ON COLUMN public.profiles.club_sync_enabled IS 'Enables automatic application to jobs with 90%+ match';
COMMENT ON TABLE public.saved_jobs IS 'Stores user saved/bookmarked jobs';
COMMENT ON COLUMN public.profiles.years_of_experience IS 'Total years of professional experience for better matching';
COMMENT ON COLUMN public.profiles.skills IS 'User skills for job matching algorithm';
COMMENT ON COLUMN public.profiles.preferred_job_types IS 'Preferred employment types (fulltime, contract, etc)';
COMMENT ON COLUMN public.profiles.preferred_locations IS 'Preferred work locations for job matching';
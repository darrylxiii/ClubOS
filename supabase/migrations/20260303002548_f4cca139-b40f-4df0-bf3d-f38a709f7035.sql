
-- Add missing columns to jobs table for enterprise job creation wizard
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS experience_level text,
  ADD COLUMN IF NOT EXISTS seniority_level text,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS location_type text DEFAULT 'onsite',
  ADD COLUMN IF NOT EXISTS urgency text DEFAULT 'no_rush',
  ADD COLUMN IF NOT EXISTS expected_start_date date;

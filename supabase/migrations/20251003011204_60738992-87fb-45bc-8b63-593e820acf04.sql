-- Add profile fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS current_title TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS notice_period TEXT DEFAULT '2_weeks',
ADD COLUMN IF NOT EXISTS career_preferences TEXT,
ADD COLUMN IF NOT EXISTS current_salary_min INTEGER,
ADD COLUMN IF NOT EXISTS current_salary_max INTEGER,
ADD COLUMN IF NOT EXISTS desired_salary_min INTEGER,
ADD COLUMN IF NOT EXISTS desired_salary_max INTEGER,
ADD COLUMN IF NOT EXISTS blocked_companies JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS resume_url TEXT;

-- Add comment
COMMENT ON COLUMN public.profiles.blocked_companies IS 'Array of company names that the user wants to block';
COMMENT ON COLUMN public.profiles.notice_period IS 'Notice period: immediate, 2_weeks, 1_month, 2_months, 3_months';
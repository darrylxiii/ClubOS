
-- Phase 2: Add Missing Candidate Profile Fields

-- =====================================================
-- 1. Add Industry & Company Preferences
-- =====================================================

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS industry_preference TEXT,
ADD COLUMN IF NOT EXISTS company_size_preference TEXT,
ADD COLUMN IF NOT EXISTS job_alert_frequency TEXT DEFAULT 'daily',
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS available_hours_per_week INTEGER;

-- =====================================================
-- 2. Add Comments for Documentation
-- =====================================================

COMMENT ON COLUMN public.profiles.industry_preference IS 'Preferred industry sectors (e.g., Tech, Finance, Healthcare)';
COMMENT ON COLUMN public.profiles.company_size_preference IS 'Preferred company size (e.g., startup, scale-up, enterprise)';
COMMENT ON COLUMN public.profiles.job_alert_frequency IS 'How often user wants job alerts: daily, weekly, monthly, never';
COMMENT ON COLUMN public.profiles.preferred_language IS 'User preferred language: en, nl, de, fr, es';
COMMENT ON COLUMN public.profiles.available_hours_per_week IS 'Available hours per week for freelance/contract work';

-- =====================================================
-- 3. Add Similar Fields to candidate_profiles
-- =====================================================

ALTER TABLE public.candidate_profiles
ADD COLUMN IF NOT EXISTS industry_preference TEXT,
ADD COLUMN IF NOT EXISTS company_size_preference TEXT,
ADD COLUMN IF NOT EXISTS job_alert_frequency TEXT DEFAULT 'daily',
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS available_hours_per_week INTEGER;

COMMENT ON COLUMN public.candidate_profiles.industry_preference IS 'Preferred industry sectors for job matching';
COMMENT ON COLUMN public.candidate_profiles.company_size_preference IS 'Preferred company size for job matching';
COMMENT ON COLUMN public.candidate_profiles.job_alert_frequency IS 'Job alert frequency preference';
COMMENT ON COLUMN public.candidate_profiles.preferred_language IS 'Communication language preference';
COMMENT ON COLUMN public.candidate_profiles.available_hours_per_week IS 'Available work hours per week';

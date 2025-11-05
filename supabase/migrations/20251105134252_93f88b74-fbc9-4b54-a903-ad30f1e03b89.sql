-- Add work availability and timezone preferences to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS work_timezone TEXT DEFAULT 'Europe/Amsterdam',
ADD COLUMN IF NOT EXISTS work_hours_start TIME DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS work_hours_end TIME DEFAULT '17:00',
ADD COLUMN IF NOT EXISTS work_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5],
ADD COLUMN IF NOT EXISTS work_timezone_flexibility_hours INTEGER DEFAULT 0 CHECK (work_timezone_flexibility_hours >= 0 AND work_timezone_flexibility_hours <= 12),
ADD COLUMN IF NOT EXISTS reference_timezone TEXT,
ADD COLUMN IF NOT EXISTS weekend_availability BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS overtime_willingness INTEGER DEFAULT 5 CHECK (overtime_willingness >= 0 AND overtime_willingness <= 10);

-- Add helpful comment
COMMENT ON COLUMN public.profiles.work_timezone IS 'User primary timezone (IANA format, e.g., America/New_York)';
COMMENT ON COLUMN public.profiles.work_hours_start IS 'Work start time in user timezone';
COMMENT ON COLUMN public.profiles.work_hours_end IS 'Work end time in user timezone';
COMMENT ON COLUMN public.profiles.work_days IS 'Working days (1=Mon, 7=Sun)';
COMMENT ON COLUMN public.profiles.work_timezone_flexibility_hours IS 'Hours willing to shift from reference timezone (±0-12)';
COMMENT ON COLUMN public.profiles.reference_timezone IS 'Preferred timezone to align with (e.g., Europe/Amsterdam for CET companies)';
COMMENT ON COLUMN public.profiles.weekend_availability IS 'Available to work weekends';
COMMENT ON COLUMN public.profiles.overtime_willingness IS 'Willingness to work beyond stated hours (0=strict, 10=very flexible)';

-- Create index for timezone-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_work_timezone ON public.profiles(work_timezone);
CREATE INDEX IF NOT EXISTS idx_profiles_reference_timezone ON public.profiles(reference_timezone);
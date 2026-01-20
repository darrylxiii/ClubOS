-- Add GitHub connection and freelance compensation fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS github_connected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS github_username TEXT,
ADD COLUMN IF NOT EXISTS github_profile_data JSONB,
ADD COLUMN IF NOT EXISTS employment_type_preference TEXT CHECK (employment_type_preference IN ('fulltime', 'freelance', 'both')) DEFAULT 'fulltime',
ADD COLUMN IF NOT EXISTS freelance_hourly_rate_min INTEGER,
ADD COLUMN IF NOT EXISTS freelance_hourly_rate_max INTEGER;
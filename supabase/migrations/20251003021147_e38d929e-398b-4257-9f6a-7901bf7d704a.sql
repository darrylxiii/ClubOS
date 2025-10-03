-- Add social media connection fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS linkedin_connected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS linkedin_profile_data JSONB,
ADD COLUMN IF NOT EXISTS instagram_connected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS instagram_username TEXT,
ADD COLUMN IF NOT EXISTS twitter_connected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS twitter_username TEXT;
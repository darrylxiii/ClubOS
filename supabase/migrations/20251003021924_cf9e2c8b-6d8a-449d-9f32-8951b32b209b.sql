-- Add hours per week preferences to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS fulltime_hours_per_week INTEGER DEFAULT 40,
ADD COLUMN IF NOT EXISTS freelance_hours_per_week INTEGER DEFAULT 20;
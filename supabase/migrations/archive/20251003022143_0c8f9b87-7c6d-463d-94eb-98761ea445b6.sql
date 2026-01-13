-- Update hours per week to have min/max ranges
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS fulltime_hours_per_week,
DROP COLUMN IF EXISTS freelance_hours_per_week;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS fulltime_hours_per_week_min INTEGER DEFAULT 35,
ADD COLUMN IF NOT EXISTS fulltime_hours_per_week_max INTEGER DEFAULT 45,
ADD COLUMN IF NOT EXISTS freelance_hours_per_week_min INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS freelance_hours_per_week_max INTEGER DEFAULT 25;
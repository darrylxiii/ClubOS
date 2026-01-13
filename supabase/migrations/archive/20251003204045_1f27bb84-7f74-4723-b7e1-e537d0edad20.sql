-- Add currency field to jobs table
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'EUR';

-- Add currency preference to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferred_currency text NOT NULL DEFAULT 'EUR';

-- Add comment for clarity
COMMENT ON COLUMN public.jobs.currency IS 'Currency code for salary (EUR, USD, GBP, AED)';
COMMENT ON COLUMN public.profiles.preferred_currency IS 'User preferred currency for display (EUR, USD, GBP, AED)';
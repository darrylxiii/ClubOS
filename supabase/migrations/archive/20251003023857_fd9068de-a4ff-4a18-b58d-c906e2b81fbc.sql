-- Add stealth mode fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stealth_mode_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS stealth_mode_level integer DEFAULT 1 CHECK (stealth_mode_level BETWEEN 1 AND 3),
ADD COLUMN IF NOT EXISTS allow_stealth_cold_outreach boolean DEFAULT true;
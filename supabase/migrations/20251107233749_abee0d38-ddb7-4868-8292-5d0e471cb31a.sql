-- Make email column nullable in candidate_profiles table
ALTER TABLE public.candidate_profiles 
ALTER COLUMN email DROP NOT NULL;
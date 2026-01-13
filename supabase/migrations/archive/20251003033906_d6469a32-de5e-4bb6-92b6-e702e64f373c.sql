-- Add email_verified column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
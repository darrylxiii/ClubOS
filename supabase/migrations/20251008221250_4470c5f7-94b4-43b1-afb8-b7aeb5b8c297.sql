-- Add instagram_url column to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS instagram_url TEXT;
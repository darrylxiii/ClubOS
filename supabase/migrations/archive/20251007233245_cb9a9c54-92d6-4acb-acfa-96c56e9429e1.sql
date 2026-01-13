-- Add contract end date and indefinite contract fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS contract_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS has_indefinite_contract BOOLEAN DEFAULT false;
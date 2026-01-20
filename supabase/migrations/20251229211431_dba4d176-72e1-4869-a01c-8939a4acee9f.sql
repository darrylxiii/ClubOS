-- Add attempted_at column to login_attempts table
ALTER TABLE public.login_attempts 
ADD COLUMN IF NOT EXISTS attempted_at TIMESTAMPTZ DEFAULT now();

-- Update existing rows to have attempted_at set to created_at
UPDATE public.login_attempts 
SET attempted_at = created_at 
WHERE attempted_at IS NULL;
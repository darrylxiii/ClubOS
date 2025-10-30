-- Make user_id nullable to support both authenticated and unauthenticated verification flows
ALTER TABLE public.email_verifications 
ALTER COLUMN user_id DROP NOT NULL;

-- Add a check constraint to ensure data integrity:
-- Either user_id is provided (authenticated) OR it's null (public funnel)
-- But the email must always be present
ALTER TABLE public.email_verifications 
ADD CONSTRAINT email_verifications_user_or_email_check 
CHECK (user_id IS NOT NULL OR email IS NOT NULL);

-- Add comment explaining the design
COMMENT ON COLUMN public.email_verifications.user_id IS 
'User ID for authenticated verification flows. NULL for public/unauthenticated flows (e.g., partner onboarding funnel).';
-- Allow applications.user_id to be nullable for standalone candidates
ALTER TABLE public.applications ALTER COLUMN user_id DROP NOT NULL;

-- Add index for better performance on nullable user_id queries
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON public.applications(user_id) WHERE user_id IS NOT NULL;

-- Update RLS policies to work with nullable user_id
DROP POLICY IF EXISTS "Users can view their own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can create their own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can update their own applications" ON public.applications;

-- Recreate policies with NULL handling
CREATE POLICY "Users can view their own applications" 
ON public.applications 
FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Users can create their own applications" 
ON public.applications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own applications" 
ON public.applications 
FOR UPDATE 
USING (auth.uid() = user_id OR user_id IS NULL);

-- Allow admins/partners to view all applications
CREATE POLICY "Admins can view all applications with null user" 
ON public.applications 
FOR SELECT 
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner'));

COMMENT ON COLUMN public.applications.user_id IS 'References auth.users - nullable for candidates who are not yet platform users';
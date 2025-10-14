-- Drop the restrictive expert-only insert policy
DROP POLICY IF EXISTS "Experts can create courses" ON public.courses;

-- Create a new policy allowing authenticated users to create courses
CREATE POLICY "Authenticated users can create courses"
ON public.courses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Add a policy to allow users to view their own expert profile
DROP POLICY IF EXISTS "Users can view their own expert profile" ON public.expert_profiles;

CREATE POLICY "Users can view their own expert profile"
ON public.expert_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
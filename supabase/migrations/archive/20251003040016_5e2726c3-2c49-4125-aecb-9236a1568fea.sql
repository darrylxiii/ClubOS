-- Drop the public view since we'll allow authenticated users to see their strategists directly
DROP VIEW IF EXISTS public.public_talent_strategists;

-- Update RLS policy to allow authenticated users to view talent strategists
-- (Security comes from only showing strategists that are assigned to them in the app logic)
CREATE POLICY "Authenticated users can view talent strategists"
ON public.talent_strategists
FOR SELECT
TO authenticated
USING (true);
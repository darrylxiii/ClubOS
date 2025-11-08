-- Step 1: Drop the broken policy that causes infinite recursion
DROP POLICY IF EXISTS "Team members can view team roles for mentions" ON public.user_roles;

-- Step 2: Create a security definer function to check if user is a team member
-- This avoids recursion by executing with elevated privileges
CREATE OR REPLACE FUNCTION public.is_team_member(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = check_user_id
      AND role IN ('admin', 'strategist', 'partner')
  );
$$;

-- Step 3: Create proper RLS policy using the function (no recursion)
CREATE POLICY "Team members can view all team roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  -- Current user must be a team member
  public.is_team_member(auth.uid())
  -- And they can only see team member roles
  AND role IN ('admin', 'strategist', 'partner')
);

-- Step 4: Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid) TO authenticated;
-- Fix RLS infinite recursion on employee_profiles

-- Step 1: Create helper function to check if user is a manager (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_manager_of(target_manager_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM employee_profiles ep
    WHERE ep.user_id = auth.uid()
      AND ep.id = target_manager_id
  )
$$;

-- Step 2: Drop the problematic policies
DROP POLICY IF EXISTS "Managers can view direct reports" ON employee_profiles;
DROP POLICY IF EXISTS "Admins can manage all employee profiles" ON employee_profiles;

-- Step 3: Recreate policies using helper functions (no recursion)
CREATE POLICY "Managers can view direct reports" 
ON employee_profiles
FOR SELECT
USING (public.is_manager_of(manager_id));

CREATE POLICY "Admins can manage all employee profiles" 
ON employee_profiles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
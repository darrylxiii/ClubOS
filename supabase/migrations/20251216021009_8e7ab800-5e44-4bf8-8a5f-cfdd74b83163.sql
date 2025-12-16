-- Drop existing function first
DROP FUNCTION IF EXISTS public.is_page_owner(uuid);

-- Create SECURITY DEFINER function to safely check page ownership without RLS recursion
CREATE OR REPLACE FUNCTION public.is_page_owner(p_page_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_pages 
    WHERE id = p_page_id AND user_id = auth.uid()
  );
$$;

-- Drop the problematic ALL policy that causes recursion
DROP POLICY IF EXISTS "Page owners can manage permissions" ON page_permissions;

-- Recreate policies for page_permissions using the SECURITY DEFINER function
CREATE POLICY "Page owners can manage permissions"
ON page_permissions
FOR ALL
USING (public.is_page_owner(page_id))
WITH CHECK (public.is_page_owner(page_id));

-- Also fix any duplicate SELECT policies
DROP POLICY IF EXISTS "Users can view their own permissions" ON page_permissions;
DROP POLICY IF EXISTS "Users can view their permissions" ON page_permissions;

CREATE POLICY "Users can view their permissions"
ON page_permissions
FOR SELECT
USING (
  user_id = auth.uid() 
  OR email = (auth.jwt() ->> 'email'::text)
  OR public.is_page_owner(page_id)
);
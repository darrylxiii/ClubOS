-- Create SECURITY DEFINER helper function to check page ownership
-- This bypasses RLS to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.is_page_owner(_page_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_pages 
    WHERE id = _page_id AND user_id = auth.uid()
  );
$$;

-- Drop the existing problematic policy on page_permissions
DROP POLICY IF EXISTS "Page owners can manage permissions" ON public.page_permissions;

-- Create new policy using the helper function
CREATE POLICY "Page owners can manage permissions" 
ON public.page_permissions
FOR ALL
USING (public.is_page_owner(page_id))
WITH CHECK (public.is_page_owner(page_id));
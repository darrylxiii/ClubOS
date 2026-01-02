-- Create SECURITY DEFINER helper function to get user's workspace IDs without RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_workspace_ids()
RETURNS SETOF UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT workspace_id FROM workspace_members 
  WHERE user_id = auth.uid() AND is_active = true;
$$;

-- Create helper to check if user is workspace owner/admin
CREATE OR REPLACE FUNCTION public.is_workspace_admin(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = p_workspace_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'admin')
    AND is_active = true
  );
$$;

-- Drop existing problematic policies on workspace_members
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can view their workspace memberships" ON workspace_members;
DROP POLICY IF EXISTS "Admins can manage workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can insert workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can update workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can delete workspace members" ON workspace_members;

-- Create new non-recursive policies for workspace_members
CREATE POLICY "Users can view own membership"
ON workspace_members FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can view co-members via function"
ON workspace_members FOR SELECT
USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Users can create own membership"
ON workspace_members FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can add members"
ON workspace_members FOR INSERT
WITH CHECK (public.is_workspace_admin(workspace_id));

CREATE POLICY "Users can update own membership"
ON workspace_members FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Admins can update members"
ON workspace_members FOR UPDATE
USING (public.is_workspace_admin(workspace_id));

CREATE POLICY "Users can delete own membership"
ON workspace_members FOR DELETE
USING (user_id = auth.uid());

CREATE POLICY "Admins can delete members"
ON workspace_members FOR DELETE
USING (public.is_workspace_admin(workspace_id));

-- Drop existing problematic policies on workspace_pages
DROP POLICY IF EXISTS "Users can view workspace pages" ON workspace_pages;
DROP POLICY IF EXISTS "Users can create workspace pages" ON workspace_pages;
DROP POLICY IF EXISTS "Users can update workspace pages" ON workspace_pages;
DROP POLICY IF EXISTS "Users can delete workspace pages" ON workspace_pages;

-- Create new non-recursive policies for workspace_pages
CREATE POLICY "Members can view workspace pages"
ON workspace_pages FOR SELECT
USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Members can create workspace pages"
ON workspace_pages FOR INSERT
WITH CHECK (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Members can update workspace pages"
ON workspace_pages FOR UPDATE
USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Members can delete workspace pages"
ON workspace_pages FOR DELETE
USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

-- Also fix workspaces table policies if they reference workspace_members
DROP POLICY IF EXISTS "Users can view their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can update their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can delete their workspaces" ON workspaces;

CREATE POLICY "Users can view their workspaces"
ON workspaces FOR SELECT
USING (
  created_by = auth.uid() 
  OR id IN (SELECT public.get_user_workspace_ids())
);

CREATE POLICY "Users can create workspaces"
ON workspaces FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Owners can update workspaces"
ON workspaces FOR UPDATE
USING (
  created_by = auth.uid() 
  OR public.is_workspace_admin(id)
);

CREATE POLICY "Owners can delete workspaces"
ON workspaces FOR DELETE
USING (created_by = auth.uid());
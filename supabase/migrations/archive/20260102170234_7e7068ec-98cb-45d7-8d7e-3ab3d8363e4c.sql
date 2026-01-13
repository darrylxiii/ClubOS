-- Fix infinite recursion in workspace_members policies by removing legacy recursive policies

-- Recreate helper functions with row_security disabled to guarantee no RLS evaluation inside
CREATE OR REPLACE FUNCTION public.get_user_workspace_ids()
RETURNS SETOF UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
SET row_security = off
STABLE
AS $$
  SELECT workspace_id
  FROM public.workspace_members
  WHERE user_id = auth.uid()
    AND is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_admin(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
SET row_security = off
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND is_active = true
  );
$$;

-- Drop ALL existing policies on workspace_members/workspace_pages/workspaces (including legacy ones)
DO $$
DECLARE r record;
BEGIN
  FOR r IN (
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='workspace_members'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.workspace_members', r.policyname);
  END LOOP;

  FOR r IN (
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='workspace_pages'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.workspace_pages', r.policyname);
  END LOOP;

  FOR r IN (
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='workspaces'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.workspaces', r.policyname);
  END LOOP;
END $$;

-- workspace_members: minimal, non-recursive policies
CREATE POLICY "wm_select_own"
ON public.workspace_members
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "wm_select_coworkers"
ON public.workspace_members
FOR SELECT
USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "wm_insert_self"
ON public.workspace_members
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "wm_insert_admin"
ON public.workspace_members
FOR INSERT
WITH CHECK (public.is_workspace_admin(workspace_id));

CREATE POLICY "wm_update_self"
ON public.workspace_members
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "wm_update_admin"
ON public.workspace_members
FOR UPDATE
USING (public.is_workspace_admin(workspace_id));

CREATE POLICY "wm_delete_self"
ON public.workspace_members
FOR DELETE
USING (user_id = auth.uid());

CREATE POLICY "wm_delete_admin"
ON public.workspace_members
FOR DELETE
USING (public.is_workspace_admin(workspace_id));

-- workspace_pages: access by workspace membership
CREATE POLICY "wp_select_member"
ON public.workspace_pages
FOR SELECT
USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "wp_insert_member"
ON public.workspace_pages
FOR INSERT
WITH CHECK (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "wp_update_member"
ON public.workspace_pages
FOR UPDATE
USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "wp_delete_member"
ON public.workspace_pages
FOR DELETE
USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

-- workspaces: creator + members
CREATE POLICY "ws_select_member_or_creator"
ON public.workspaces
FOR SELECT
USING (created_by = auth.uid() OR id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "ws_insert_creator"
ON public.workspaces
FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "ws_update_admin_or_creator"
ON public.workspaces
FOR UPDATE
USING (created_by = auth.uid() OR public.is_workspace_admin(id));

CREATE POLICY "ws_delete_creator"
ON public.workspaces
FOR DELETE
USING (created_by = auth.uid());
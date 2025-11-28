-- Fix infinite recursion in RLS policies for live_server_members and live_channels

-- Drop ALL existing policies on live_server_members to start fresh
DROP POLICY IF EXISTS "Members can view other members" ON live_server_members;
DROP POLICY IF EXISTS "Server owners can manage members" ON live_server_members;
DROP POLICY IF EXISTS "Users can view their own membership" ON live_server_members;
DROP POLICY IF EXISTS "Users can view members in their servers" ON live_server_members;
DROP POLICY IF EXISTS "Users can join servers" ON live_server_members;
DROP POLICY IF EXISTS "Users can leave servers" ON live_server_members;
DROP POLICY IF EXISTS "Server admins can manage members" ON live_server_members;

-- Drop ALL existing policies on live_channels to start fresh
DROP POLICY IF EXISTS "Admins can manage channels" ON live_channels;
DROP POLICY IF EXISTS "Server admins can manage channels" ON live_channels;
DROP POLICY IF EXISTS "Members can create channels" ON live_channels;
DROP POLICY IF EXISTS "Members can view channels" ON live_channels;

-- Create SECURITY DEFINER helper function to get user's server IDs
-- This prevents infinite recursion by not querying live_server_members in SELECT policies
CREATE OR REPLACE FUNCTION get_user_server_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT server_id FROM live_server_members WHERE user_id = auth.uid();
$$;

-- Create SECURITY DEFINER helper function to check if user is server admin
-- This prevents infinite recursion by not querying live_server_members in policies
CREATE OR REPLACE FUNCTION is_server_admin(check_server_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM live_server_members 
    WHERE server_id = check_server_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  );
$$;

-- Create new non-recursive policies for live_server_members

-- Users can always view their own membership
CREATE POLICY "Users can view their own membership"
ON live_server_members FOR SELECT
USING (user_id = auth.uid());

-- Users can view other members in servers they belong to (using helper function)
CREATE POLICY "Users can view members in their servers"
ON live_server_members FOR SELECT
USING (server_id IN (SELECT get_user_server_ids()));

-- Users can insert themselves (join servers)
CREATE POLICY "Users can join servers"
ON live_server_members FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can leave servers (delete their own membership)
CREATE POLICY "Users can leave servers"
ON live_server_members FOR DELETE
USING (user_id = auth.uid());

-- Admins can manage members (using helper function to avoid recursion)
CREATE POLICY "Server admins can manage members"
ON live_server_members FOR ALL
USING (is_server_admin(server_id));

-- Create new non-recursive policies for live_channels

-- Everyone can view channels in servers they're members of
CREATE POLICY "Members can view channels"
ON live_channels FOR SELECT
USING (server_id IN (SELECT get_user_server_ids()));

-- Members can create channels in servers they belong to
CREATE POLICY "Members can create channels"
ON live_channels FOR INSERT
WITH CHECK (server_id IN (SELECT get_user_server_ids()));

-- Admins can update and delete channels (using helper function)
CREATE POLICY "Server admins can manage channels"
ON live_channels FOR ALL
USING (is_server_admin(server_id));
-- Fix RLS policy for applications table to allow admin inserts
-- Drop existing insert policy if it exists
DROP POLICY IF EXISTS "Users can insert their own applications" ON applications;
DROP POLICY IF EXISTS "Admins can insert applications" ON applications;

-- Create comprehensive insert policy for applications
-- Allows users to insert their own applications AND allows admins to insert any application
CREATE POLICY "Allow user and admin inserts on applications"
ON applications
FOR INSERT
WITH CHECK (
  -- User can insert their own application
  auth.uid() = user_id
  OR
  -- Admin can insert any application (including with null user_id for standalone candidates)
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
  OR
  -- Partner can insert applications
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'partner'
  )
);
-- Phase 2 & 3: Security Hardening - Add server-side role verification function (FIXED)
-- This function provides safe role checking without recursive RLS issues

-- Create function to check if user has specific role (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.user_has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role::text = _role
  );
END;
$$;

-- Create function to get all roles for a user
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS TABLE(role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.user_roles
  WHERE user_id = _user_id;
$$;

-- Add comments
COMMENT ON FUNCTION public.user_has_role IS 'Server-side role verification - checks if user has specific role';
COMMENT ON FUNCTION public.get_user_roles IS 'Server-side role retrieval - returns all roles for a user';

-- Create indexes for performance on role lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role ON user_roles(user_id, role);

-- Drop existing policy if it exists before creating new one
DROP POLICY IF EXISTS "Admins can view all candidates" ON candidate_profiles;

-- Add RLS policy that uses the safe role checking function
-- Example: Only admins can view all candidate profiles
CREATE POLICY "Admins can view all candidates"
ON candidate_profiles
FOR SELECT
TO authenticated
USING (public.user_has_role(auth.uid(), 'admin'));

-- Track security events when roles are checked (optional monitoring)
CREATE TABLE IF NOT EXISTS public.role_verification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  checked_role text NOT NULL,
  result boolean NOT NULL,
  checked_at timestamptz DEFAULT now(),
  ip_address inet,
  function_name text
);

CREATE INDEX IF NOT EXISTS idx_role_verification_logs_user_id ON role_verification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_role_verification_logs_checked_at ON role_verification_logs(checked_at DESC);

COMMENT ON TABLE public.role_verification_logs IS 'Audit trail for role verification attempts';

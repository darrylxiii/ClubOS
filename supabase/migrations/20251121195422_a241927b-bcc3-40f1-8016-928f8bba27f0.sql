-- Fix security warning: Enable RLS on role_verification_logs table
ALTER TABLE public.role_verification_logs ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for role_verification_logs
-- Only admins can view role verification logs
CREATE POLICY "Admins can view role verification logs"
ON role_verification_logs
FOR SELECT
TO authenticated
USING (public.user_has_role(auth.uid(), 'admin'));

-- System can insert logs (for edge functions using service role)
CREATE POLICY "Service role can insert role verification logs"
ON role_verification_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.role_verification_logs IS 'Audit trail for role verification attempts - RLS enabled, admin read-only';

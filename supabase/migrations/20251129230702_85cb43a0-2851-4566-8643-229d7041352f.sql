-- Add missing RLS policies for tracking tables

-- user_device_info INSERT policy
CREATE POLICY "Users can insert own device info"
ON public.user_device_info
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- user_feature_usage INSERT policy
CREATE POLICY "Users can insert own feature usage"
ON public.user_feature_usage
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- admin_audit_activity INSERT policy (admins only)
CREATE POLICY "Admins can insert audit logs"
ON public.admin_audit_activity
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'strategist')
  )
);
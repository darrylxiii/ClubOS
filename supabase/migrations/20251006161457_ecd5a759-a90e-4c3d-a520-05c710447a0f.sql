-- Audit Log Table for Role Changes
CREATE TABLE IF NOT EXISTS public.role_change_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_roles JSONB DEFAULT '[]'::jsonb,
  new_roles JSONB DEFAULT '[]'::jsonb,
  change_type TEXT NOT NULL CHECK (change_type IN ('role_assigned', 'role_removed', 'role_switched', 'bulk_update')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.role_change_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own audit logs" ON public.role_change_audit
  FOR SELECT USING (user_id = auth.uid() OR changed_by = auth.uid());

CREATE POLICY "Admins can view all audit logs" ON public.role_change_audit
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert audit logs" ON public.role_change_audit
  FOR INSERT WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_role_change_audit_user_id ON public.role_change_audit(user_id, created_at DESC);
CREATE INDEX idx_role_change_audit_changed_by ON public.role_change_audit(changed_by, created_at DESC);
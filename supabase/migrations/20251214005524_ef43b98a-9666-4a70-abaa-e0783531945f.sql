-- Phase 1B: God Mode Admin Capabilities - Functions and Policies

-- 1. RLS policy - only admins can view
DROP POLICY IF EXISTS "Admins can view account actions" ON public.admin_account_actions;
CREATE POLICY "Admins can view account actions" ON public.admin_account_actions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- 2. RLS policy - only admins can insert
DROP POLICY IF EXISTS "Admins can create account actions" ON public.admin_account_actions;
CREATE POLICY "Admins can create account actions" ON public.admin_account_actions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- 3. Create function to check if user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = check_user_id 
    AND role = 'super_admin'
  );
END;
$$;

-- 4. Create function to check if current user can modify target user
CREATE OR REPLACE FUNCTION public.can_modify_user(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_is_super BOOLEAN;
  target_is_super BOOLEAN;
  current_is_admin BOOLEAN;
BEGIN
  SELECT is_super_admin(auth.uid()) INTO current_is_super;
  SELECT is_super_admin(target_user_id) INTO target_is_super;
  
  IF current_is_super THEN
    RETURN true;
  END IF;
  
  IF target_is_super THEN
    RETURN false;
  END IF;
  
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) INTO current_is_admin;
  
  RETURN current_is_admin;
END;
$$;

-- 5. Create function to suspend user
CREATE OR REPLACE FUNCTION public.suspend_user(
  p_target_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_previous_status account_status_enum;
BEGIN
  IF NOT can_modify_user(p_target_user_id) THEN
    RAISE EXCEPTION 'Insufficient permissions to suspend this user';
  END IF;
  
  SELECT account_status INTO v_previous_status FROM profiles WHERE id = p_target_user_id;
  
  UPDATE profiles
  SET 
    account_status = 'suspended',
    suspension_reason = p_reason,
    suspended_at = now(),
    suspended_by = auth.uid()
  WHERE id = p_target_user_id;
  
  INSERT INTO admin_account_actions (admin_id, target_user_id, action_type, reason, previous_status, new_status)
  VALUES (auth.uid(), p_target_user_id, 'suspend', p_reason, v_previous_status, 'suspended');
  
  RETURN true;
END;
$$;

-- 6. Create function to unsuspend user
CREATE OR REPLACE FUNCTION public.unsuspend_user(p_target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT can_modify_user(p_target_user_id) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;
  
  UPDATE profiles
  SET account_status = 'active', suspension_reason = NULL, suspended_at = NULL, suspended_by = NULL
  WHERE id = p_target_user_id;
  
  INSERT INTO admin_account_actions (admin_id, target_user_id, action_type, previous_status, new_status)
  VALUES (auth.uid(), p_target_user_id, 'unsuspend', 'suspended', 'active');
  
  RETURN true;
END;
$$;

-- 7. Create function to ban user
CREATE OR REPLACE FUNCTION public.ban_user(
  p_target_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_previous_status account_status_enum;
BEGIN
  IF NOT can_modify_user(p_target_user_id) THEN
    RAISE EXCEPTION 'Insufficient permissions to ban this user';
  END IF;
  
  SELECT account_status INTO v_previous_status FROM profiles WHERE id = p_target_user_id;
  
  UPDATE profiles
  SET account_status = 'banned', ban_reason = p_reason, banned_at = now(), banned_by = auth.uid()
  WHERE id = p_target_user_id;
  
  INSERT INTO admin_account_actions (admin_id, target_user_id, action_type, reason, previous_status, new_status)
  VALUES (auth.uid(), p_target_user_id, 'ban', p_reason, v_previous_status, 'banned');
  
  RETURN true;
END;
$$;

-- 8. Create function to unban user
CREATE OR REPLACE FUNCTION public.unban_user(p_target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT can_modify_user(p_target_user_id) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;
  
  UPDATE profiles
  SET account_status = 'active', ban_reason = NULL, banned_at = NULL, banned_by = NULL
  WHERE id = p_target_user_id;
  
  INSERT INTO admin_account_actions (admin_id, target_user_id, action_type, previous_status, new_status)
  VALUES (auth.uid(), p_target_user_id, 'unban', 'banned', 'active');
  
  RETURN true;
END;
$$;

-- 9. Create function to force password reset
CREATE OR REPLACE FUNCTION public.force_user_password_reset(
  p_target_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT can_modify_user(p_target_user_id) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;
  
  UPDATE profiles
  SET force_password_reset = true, force_password_reset_reason = p_reason, force_password_reset_by = auth.uid(), force_password_reset_at = now()
  WHERE id = p_target_user_id;
  
  INSERT INTO admin_account_actions (admin_id, target_user_id, action_type, reason, metadata)
  VALUES (auth.uid(), p_target_user_id, 'force_password_reset', p_reason, jsonb_build_object('forced_at', now()));
  
  RETURN true;
END;
$$;

-- 10. Create function to clear force password reset
CREATE OR REPLACE FUNCTION public.clear_force_password_reset(p_target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET force_password_reset = false, force_password_reset_reason = NULL, force_password_reset_by = NULL, force_password_reset_at = NULL
  WHERE id = p_target_user_id;
  
  INSERT INTO admin_account_actions (admin_id, target_user_id, action_type, metadata)
  VALUES (auth.uid(), p_target_user_id, 'clear_password_reset', jsonb_build_object('cleared_at', now()));
  
  RETURN true;
END;
$$;

-- 11. Create function to promote to super admin
CREATE OR REPLACE FUNCTION public.promote_to_super_admin(p_target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can promote users';
  END IF;
  
  IF is_super_admin(p_target_user_id) THEN
    RAISE EXCEPTION 'User is already a super admin';
  END IF;
  
  INSERT INTO user_roles (user_id, role, assigned_by)
  VALUES (p_target_user_id, 'super_admin', auth.uid())
  ON CONFLICT (user_id, role) DO NOTHING;
  
  INSERT INTO admin_account_actions (admin_id, target_user_id, action_type, metadata)
  VALUES (auth.uid(), p_target_user_id, 'promote_super_admin', jsonb_build_object('promoted_at', now()));
  
  RETURN true;
END;
$$;

-- 12. Create function to demote from super admin
CREATE OR REPLACE FUNCTION public.demote_from_super_admin(p_target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can demote users';
  END IF;
  
  IF p_target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot demote yourself';
  END IF;
  
  DELETE FROM user_roles WHERE user_id = p_target_user_id AND role = 'super_admin';
  
  INSERT INTO admin_account_actions (admin_id, target_user_id, action_type, metadata)
  VALUES (auth.uid(), p_target_user_id, 'demote_super_admin', jsonb_build_object('demoted_at', now()));
  
  RETURN true;
END;
$$;

-- 13. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_super_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_modify_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.suspend_user(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unsuspend_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ban_user(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unban_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.force_user_password_reset(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_force_password_reset(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.promote_to_super_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.demote_from_super_admin(UUID) TO authenticated;
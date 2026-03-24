
-- Backfill last_login_at from auth.users.last_sign_in_at
DO $$
BEGIN
  UPDATE public.user_activity_tracking uat
  SET last_login_at = u.last_sign_in_at
  FROM auth.users u
  WHERE uat.user_id = u.id
    AND u.last_sign_in_at IS NOT NULL
    AND uat.last_login_at IS NULL;
END;
$$;

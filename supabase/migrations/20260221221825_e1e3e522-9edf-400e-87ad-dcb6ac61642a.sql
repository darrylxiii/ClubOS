
CREATE OR REPLACE FUNCTION public.get_user_id_by_auth_email(lookup_email TEXT)
RETURNS TABLE(user_id UUID, auth_email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT au.id, au.email::TEXT
  FROM auth.users au
  WHERE LOWER(au.email) = LOWER(lookup_email)
  LIMIT 1;
END;
$$;

-- Revoke from public, only service role can call this
REVOKE ALL ON FUNCTION public.get_user_id_by_auth_email(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_id_by_auth_email(TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.get_user_id_by_auth_email(TEXT) FROM authenticated;

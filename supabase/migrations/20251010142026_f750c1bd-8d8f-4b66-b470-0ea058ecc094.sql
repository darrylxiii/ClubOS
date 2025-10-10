-- Fix share token generation to use built-in functions
DROP FUNCTION IF EXISTS generate_share_token();

CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  token TEXT;
BEGIN
  -- Generate a secure random token using gen_random_uuid and md5
  token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  RETURN encode(decode(token, 'hex'), 'base64');
END;
$$;
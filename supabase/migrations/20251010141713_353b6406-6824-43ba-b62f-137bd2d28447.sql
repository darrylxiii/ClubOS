-- Enable pgcrypto extension for generating secure tokens
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop and recreate the generate_share_token function with correct implementation
DROP FUNCTION IF EXISTS generate_share_token();

CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
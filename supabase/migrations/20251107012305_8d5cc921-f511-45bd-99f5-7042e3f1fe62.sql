-- Update generate_api_key to use SHA-256 matching the edge function
CREATE OR REPLACE FUNCTION public.generate_api_key(
  p_company_id UUID,
  p_name VARCHAR,
  p_scopes TEXT[],
  p_rate_limit_per_hour INTEGER DEFAULT 1000,
  p_created_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key TEXT;
  v_prefix VARCHAR(15);
  v_hash VARCHAR(64);
  v_id UUID;
  v_raw_bytes BYTEA;
BEGIN
  -- Generate random key: tqc_live_ + random string
  v_key := 'tqc_live_' || replace(gen_random_uuid()::text, '-', '') || substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8);
  
  -- Get prefix (first 15 chars)
  v_prefix := substring(v_key from 1 for 15);
  
  -- Hash the full key using SHA-256 from pgcrypto
  v_raw_bytes := public.digest(v_key::bytea, 'sha256');
  v_hash := encode(v_raw_bytes, 'hex');
  
  -- Insert the key
  INSERT INTO public.api_keys (
    company_id,
    name,
    key_prefix,
    key_hash,
    scopes,
    rate_limit_per_hour,
    created_by
  ) VALUES (
    p_company_id,
    p_name,
    v_prefix,
    v_hash,
    p_scopes,
    p_rate_limit_per_hour,
    p_created_by
  ) RETURNING id INTO v_id;
  
  -- Return the key and metadata (key only shown once!)
  RETURN jsonb_build_object(
    'id', v_id,
    'key', v_key,
    'prefix', v_prefix,
    'scopes', p_scopes,
    'rate_limit_per_hour', p_rate_limit_per_hour
  );
END;
$$;
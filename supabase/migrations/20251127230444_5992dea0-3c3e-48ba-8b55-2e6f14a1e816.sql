-- Fix function search_path security issue
CREATE OR REPLACE FUNCTION cosine_similarity(a vector, b vector)
RETURNS float
LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 1 - (a <=> b);
END;
$$;
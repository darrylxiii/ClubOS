-- Fix security warning: Set search_path for function
DROP FUNCTION IF EXISTS cleanup_expired_push_subscriptions();

CREATE OR REPLACE FUNCTION cleanup_expired_push_subscriptions()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM push_subscriptions
  WHERE updated_at < NOW() - INTERVAL '90 days';
END;
$$;
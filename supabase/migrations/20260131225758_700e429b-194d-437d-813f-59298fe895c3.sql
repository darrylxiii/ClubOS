
-- Fix tqc__assert_user_schema(text) missing search_path
CREATE OR REPLACE FUNCTION public.tqc__assert_user_schema(p_schema text)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF p_schema IS NULL OR length(p_schema) = 0 THEN
    RAISE EXCEPTION 'schema is required';
  END IF;

  IF p_schema IN (
    'pg_catalog',
    'information_schema',
    'auth',
    'storage',
    'realtime',
    'supabase_functions',
    'vault'
  ) THEN
    RAISE EXCEPTION 'schema % is not allowed', p_schema;
  END IF;
END;
$function$;

-- Function to get all public tables dynamically
CREATE OR REPLACE FUNCTION public.get_public_tables()
RETURNS TABLE(table_name text) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.table_name::text
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
  ORDER BY t.table_name;
$$;

-- Grant execute to authenticated users (edge function uses service role anyway)
GRANT EXECUTE ON FUNCTION public.get_public_tables() TO authenticated;
-- Create function to get public table names with row counts
CREATE OR REPLACE FUNCTION get_public_table_counts()
RETURNS TABLE(table_name text, row_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.relname::text as table_name,
    t.n_live_tup as row_count
  FROM pg_stat_user_tables t
  WHERE t.schemaname = 'public'
  ORDER BY t.relname;
END;
$$;
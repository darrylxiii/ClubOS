-- Create helper functions for admin exports to determine stable ordering and columns

CREATE OR REPLACE FUNCTION public.tqc__assert_user_schema(p_schema text)
RETURNS void
LANGUAGE plpgsql
AS $$
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
$$;

-- Returns columns in ordinal order for a table
CREATE OR REPLACE FUNCTION public.tqc__table_columns(p_schema text, p_table text)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cols text[];
BEGIN
  PERFORM public.tqc__assert_user_schema(p_schema);

  SELECT array_agg(c.column_name ORDER BY c.ordinal_position)
    INTO cols
  FROM information_schema.columns c
  WHERE c.table_schema = p_schema
    AND c.table_name = p_table;

  RETURN COALESCE(cols, ARRAY[]::text[]);
END;
$$;

-- Returns best single-column ordering key for keyset pagination
-- strategy: primary_key | unique_not_null | id_not_null | none
CREATE OR REPLACE FUNCTION public.tqc__table_ordering_key(p_schema text, p_table text)
RETURNS TABLE(key_column text, strategy text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pk_col text;
  uniq_col text;
  id_not_null boolean;
BEGIN
  PERFORM public.tqc__assert_user_schema(p_schema);

  -- Primary key, single column
  SELECT a.attname
    INTO pk_col
  FROM pg_index i
  JOIN pg_class t ON t.oid = i.indrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(i.indkey)
  WHERE i.indisprimary
    AND n.nspname = p_schema
    AND t.relname = p_table
    AND array_length(i.indkey, 1) = 1
  LIMIT 1;

  IF pk_col IS NOT NULL THEN
    key_column := pk_col;
    strategy := 'primary_key';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Unique index, single column, NOT NULL
  SELECT a.attname
    INTO uniq_col
  FROM pg_index i
  JOIN pg_class t ON t.oid = i.indrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(i.indkey)
  WHERE i.indisunique
    AND NOT i.indisprimary
    AND n.nspname = p_schema
    AND t.relname = p_table
    AND array_length(i.indkey, 1) = 1
    AND a.attnotnull
  LIMIT 1;

  IF uniq_col IS NOT NULL THEN
    key_column := uniq_col;
    strategy := 'unique_not_null';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Fallback: id column if NOT NULL
  SELECT (c.is_nullable = 'NO')
    INTO id_not_null
  FROM information_schema.columns c
  WHERE c.table_schema = p_schema
    AND c.table_name = p_table
    AND c.column_name = 'id'
  LIMIT 1;

  IF COALESCE(id_not_null, false) THEN
    key_column := 'id';
    strategy := 'id_not_null';
    RETURN NEXT;
    RETURN;
  END IF;

  key_column := NULL;
  strategy := 'none';
  RETURN NEXT;
END;
$$;

-- Lock down helper executor surface area: only allow authenticated roles that can already export.
REVOKE ALL ON FUNCTION public.tqc__assert_user_schema(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tqc__table_columns(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tqc__table_ordering_key(text, text) FROM PUBLIC;

-- Allow authenticated users to execute; the export function itself is admin-gated.
GRANT EXECUTE ON FUNCTION public.tqc__table_columns(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tqc__table_ordering_key(text, text) TO authenticated;

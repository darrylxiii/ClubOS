-- Fix security warnings: Add search_path to functions that are missing it

-- Find and fix functions without search_path
DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN 
    SELECT n.nspname as schema_name, p.proname as function_name
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
      'update_engagement_signals_timestamp',
      'mark_feedback_completed'
    )
  LOOP
    EXECUTE format('
      ALTER FUNCTION %I.%I() SET search_path = public;
    ', func_record.schema_name, func_record.function_name);
  END LOOP;
END $$;

-- Enable RLS on any remaining tables without it in public schema
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN 
    SELECT schemaname, tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT IN (
      SELECT tablename 
      FROM pg_tables t
      JOIN pg_class c ON c.relname = t.tablename
      WHERE c.relrowsecurity = true
      AND t.schemaname = 'public'
    )
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY;', tbl.schemaname, tbl.tablename);
    RAISE NOTICE 'Enabled RLS on %.%', tbl.schemaname, tbl.tablename;
  END LOOP;
END $$;
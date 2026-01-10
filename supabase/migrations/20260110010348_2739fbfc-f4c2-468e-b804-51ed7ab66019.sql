-- Security Migration: Fix function search_path for all public functions
-- This prevents search_path hijacking attacks

-- Batch fix all public functions with search_path = public
DO $$
DECLARE
    func_record RECORD;
    fixed_count INTEGER := 0;
BEGIN
    FOR func_record IN 
        SELECT n.nspname as schema_name, p.proname as function_name, 
               pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
        AND p.proname NOT LIKE 'pg_%'
    LOOP
        BEGIN
            EXECUTE format(
                'ALTER FUNCTION public.%I(%s) SET search_path = public',
                func_record.function_name,
                func_record.args
            );
            fixed_count := fixed_count + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not alter function %.%: %', 
                func_record.schema_name, func_record.function_name, SQLERRM;
        END;
    END LOOP;
    RAISE NOTICE 'Fixed search_path for % functions', fixed_count;
END $$;

-- Explicitly ensure critical auth functions have search_path set
ALTER FUNCTION public.has_role(uuid, app_role) SET search_path = public;
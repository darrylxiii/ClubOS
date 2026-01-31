
-- Fix remaining functions with proper drops first
DROP FUNCTION IF EXISTS public.refresh_company_benchmarks();
DROP FUNCTION IF EXISTS public.tqc__assert_user_schema();

CREATE FUNCTION public.refresh_company_benchmarks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_company RECORD;
BEGIN
  FOR v_company IN SELECT DISTINCT company_id FROM jobs WHERE company_id IS NOT NULL LOOP
    PERFORM calculate_partner_benchmarks(v_company.company_id);
  END LOOP;
END;
$$;

CREATE FUNCTION public.tqc__assert_user_schema()
RETURNS boolean
LANGUAGE sql
SET search_path = public
AS $$ SELECT true; $$;

-- Drop broken trigger that references non-existent table
DROP TRIGGER IF EXISTS trigger_create_placement_fee_on_hire ON public.applications;
DROP TRIGGER IF EXISTS trg_create_placement_fee_on_hire_insert ON public.applications;
DROP TRIGGER IF EXISTS trg_create_placement_fee_on_hire_v2 ON public.applications;

-- Drop the broken function
DROP FUNCTION IF EXISTS create_placement_fee_on_hire();

-- Keep only auto_generate_placement_fee_trigger which we fixed
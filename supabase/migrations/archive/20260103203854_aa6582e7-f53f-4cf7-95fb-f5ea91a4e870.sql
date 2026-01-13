-- Fix Claudia Bruno's application status (trigger will now create placement_fee)
UPDATE public.applications 
SET status = 'hired', updated_at = NOW()
WHERE id = '6d155cbc-eb67-4cbd-b30f-c84957bc072f'
AND status != 'hired';

-- Assign commission tiers to employees
UPDATE public.employee_profiles SET commission_tier_id = (
  SELECT id FROM public.commission_tiers WHERE name = 'Standard' LIMIT 1
) WHERE commission_percentage = 10 AND commission_tier_id IS NULL;

UPDATE public.employee_profiles SET commission_tier_id = (
  SELECT id FROM public.commission_tiers WHERE name = 'Elite' LIMIT 1
) WHERE commission_percentage = 15 AND commission_tier_id IS NULL;

UPDATE public.employee_profiles SET commission_tier_id = (
  SELECT id FROM public.commission_tiers WHERE name = 'Starter' LIMIT 1
) WHERE commission_percentage = 5 AND commission_tier_id IS NULL;
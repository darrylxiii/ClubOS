-- Phase 17: Enterprise DB Defaults Validation

-- 1. Hard-Code Companies Financial Defaults
ALTER TABLE public.companies 
  ALTER COLUMN placement_fee_percentage SET DEFAULT 20.0,
  ALTER COLUMN placement_fee_fixed SET DEFAULT 0.0;

-- Repair existing null poison
UPDATE public.companies 
SET placement_fee_percentage = 20.0 
WHERE placement_fee_percentage IS NULL;

UPDATE public.companies 
SET placement_fee_fixed = 0.0 
WHERE placement_fee_fixed IS NULL;

-- 2. Hard-Code Jobs Pipeline Defaults
ALTER TABLE public.jobs
  ALTER COLUMN deal_probability SET DEFAULT 20,
  ALTER COLUMN deal_health_score SET DEFAULT 50,
  ALTER COLUMN target_hire_count SET DEFAULT 1,
  ALTER COLUMN is_lost SET DEFAULT false;

-- Repair existing null poison
UPDATE public.jobs 
SET deal_probability = 20 
WHERE deal_probability IS NULL;

UPDATE public.jobs 
SET deal_health_score = 50 
WHERE deal_health_score IS NULL;

UPDATE public.jobs 
SET target_hire_count = 1 
WHERE target_hire_count IS NULL OR target_hire_count < 1;

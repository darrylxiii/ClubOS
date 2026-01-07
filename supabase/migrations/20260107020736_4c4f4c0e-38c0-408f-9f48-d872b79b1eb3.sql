-- Update check constraint to include 'retainer' as valid contract type
ALTER TABLE public.enterprise_contracts 
DROP CONSTRAINT IF EXISTS enterprise_contracts_contract_type_check;

ALTER TABLE public.enterprise_contracts 
ADD CONSTRAINT enterprise_contracts_contract_type_check 
CHECK (contract_type = ANY (ARRAY['standard'::text, 'enterprise'::text, 'strategic'::text, 'partnership'::text, 'retainer'::text]));

-- Create enterprise contract for Qualogy retainer
INSERT INTO public.enterprise_contracts (
  company_id,
  contract_type,
  contract_number,
  start_date,
  term_months,
  auto_renewal,
  annual_value,
  status,
  special_terms
) VALUES (
  '2ae10970-cde7-496a-8b73-4e2b1271279b',
  'retainer',
  'RET-QUALOGY-2025',
  '2025-01-01',
  12,
  true,
  60000,
  'active',
  '{"focus": "Business Analysts and Mendix Developers", "monthly_amount": 5000}'
) ON CONFLICT (contract_number) DO NOTHING;
-- Add FX rate recording to placement_fees for audit compliance
ALTER TABLE public.placement_fees
ADD COLUMN IF NOT EXISTS fx_rate_used numeric DEFAULT NULL;

COMMENT ON COLUMN public.placement_fees.fx_rate_used IS 'The EUR exchange rate used at time of fee creation. Null for EUR-denominated fees.';
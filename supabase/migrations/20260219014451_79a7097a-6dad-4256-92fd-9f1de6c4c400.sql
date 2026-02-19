
-- Add fee_amount_eur column for EUR-equivalent snapshot
ALTER TABLE public.placement_fees ADD COLUMN IF NOT EXISTS fee_amount_eur numeric;

-- Backfill existing rows (all are EUR)
UPDATE public.placement_fees SET fee_amount_eur = fee_amount WHERE fee_amount_eur IS NULL;

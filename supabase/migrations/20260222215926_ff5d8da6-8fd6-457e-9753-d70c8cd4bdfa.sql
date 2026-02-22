-- Add placement_fee_id FK to partner_invoices for reverse lookup
ALTER TABLE public.partner_invoices
  ADD COLUMN placement_fee_id UUID REFERENCES public.placement_fees(id);

-- Create index for efficient lookups
CREATE INDEX idx_partner_invoices_placement_fee_id 
  ON public.partner_invoices(placement_fee_id) 
  WHERE placement_fee_id IS NOT NULL;
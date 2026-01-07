-- Add bank details and payment terms to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_iban TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_bic TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_account_holder TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS default_payment_terms_days INTEGER DEFAULT 30;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS payment_code TEXT;

-- Add unique constraint for payment_code (allowing nulls)
CREATE UNIQUE INDEX IF NOT EXISTS companies_payment_code_unique ON companies(payment_code) WHERE payment_code IS NOT NULL;

-- Create payment_references table for structured invoice references
CREATE TABLE IF NOT EXISTS payment_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code TEXT UNIQUE NOT NULL,
  invoice_id UUID REFERENCES moneybird_sales_invoices(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  amount NUMERIC,
  currency TEXT DEFAULT 'EUR',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payout_batches table for batch payment processing
CREATE TABLE IF NOT EXISTS payout_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_code TEXT UNIQUE NOT NULL,
  total_amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'EUR',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'exported', 'processing', 'completed', 'failed')),
  payout_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  exported_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT
);

-- Add batch_id to referral_payouts if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'referral_payouts') THEN
    ALTER TABLE referral_payouts ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES payout_batches(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add batch_id to employee_commissions if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employee_commissions') THEN
    ALTER TABLE employee_commissions ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES payout_batches(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE payment_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_batches ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment_references (admin only via user_roles table)
CREATE POLICY "Admins can manage payment references" ON payment_references
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'strategist')
    )
  );

-- RLS policies for payout_batches (admin only via user_roles table)
CREATE POLICY "Admins can manage payout batches" ON payout_batches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'strategist')
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_references_company ON payment_references(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_references_invoice ON payment_references(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payout_batches_status ON payout_batches(status);
CREATE INDEX IF NOT EXISTS idx_payout_batches_created_at ON payout_batches(created_at DESC);
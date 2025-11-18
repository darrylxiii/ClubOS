-- Financial & Billing System Database Foundation

-- 1. Financial Settings (company-level billing configuration)
CREATE TABLE IF NOT EXISTS public.financial_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  default_placement_fee_percentage DECIMAL(5,2) DEFAULT 15.00,
  default_payment_terms_days INTEGER DEFAULT 30,
  currency_code TEXT DEFAULT 'EUR',
  tax_rate DECIMAL(5,2) DEFAULT 21.00,
  invoice_prefix TEXT DEFAULT 'INV',
  next_invoice_number INTEGER DEFAULT 1,
  bank_name TEXT,
  bank_account_iban TEXT,
  bank_account_swift TEXT,
  company_registration_number TEXT,
  vat_number TEXT,
  invoice_footer_notes TEXT,
  enable_stripe_payments BOOLEAN DEFAULT false,
  stripe_account_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id)
);

-- 2. Partner Billing Details (partner company billing info)
CREATE TABLE IF NOT EXISTS public.partner_billing_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  legal_company_name TEXT NOT NULL,
  vat_number TEXT,
  billing_email TEXT NOT NULL,
  billing_address_line1 TEXT NOT NULL,
  billing_address_line2 TEXT,
  billing_city TEXT NOT NULL,
  billing_state TEXT,
  billing_postal_code TEXT NOT NULL,
  billing_country TEXT NOT NULL DEFAULT 'Netherlands',
  payment_method TEXT DEFAULT 'invoice' CHECK (payment_method IN ('invoice', 'stripe', 'bank_transfer')),
  bank_account_name TEXT,
  bank_account_iban TEXT,
  bank_account_swift TEXT,
  preferred_payment_terms_days INTEGER DEFAULT 30,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id)
);

-- 3. Placement Fees (track fees when hires happen)
CREATE TABLE IF NOT EXISTS public.placement_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id),
  candidate_id UUID REFERENCES public.candidate_profiles(id),
  partner_company_id UUID REFERENCES public.companies(id),
  fee_percentage DECIMAL(5,2) NOT NULL,
  candidate_salary DECIMAL(12,2),
  fee_amount DECIMAL(12,2) NOT NULL,
  currency_code TEXT DEFAULT 'EUR',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'invoiced', 'paid', 'cancelled')),
  invoice_id UUID,
  hired_date TIMESTAMPTZ NOT NULL,
  payment_due_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 4. Partner Invoices (invoice generation and tracking)
CREATE TABLE IF NOT EXISTS public.partner_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  partner_company_id UUID REFERENCES public.companies(id) NOT NULL,
  billing_details_id UUID REFERENCES public.partner_billing_details(id),
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 21.00,
  tax_amount DECIMAL(12,2) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  currency_code TEXT DEFAULT 'EUR',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled')),
  payment_terms_days INTEGER DEFAULT 30,
  pdf_url TEXT,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  internal_notes TEXT,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 5. Invoice Line Items (link placement fees to invoices)
CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.partner_invoices(id) ON DELETE CASCADE,
  placement_fee_id UUID REFERENCES public.placement_fees(id),
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  line_total DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Payment Transactions (payment reconciliation)
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.partner_invoices(id) ON DELETE CASCADE,
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  amount DECIMAL(12,2) NOT NULL,
  currency_code TEXT DEFAULT 'EUR',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('bank_transfer', 'stripe', 'paypal', 'other')),
  payment_reference TEXT,
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  bank_transaction_id TEXT,
  proof_of_payment_url TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  notes TEXT,
  processed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Referral Payouts (referral reward workflow)
CREATE TABLE IF NOT EXISTS public.referral_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID,
  application_id UUID REFERENCES public.applications(id),
  referrer_user_id UUID REFERENCES auth.users(id) NOT NULL,
  candidate_id UUID REFERENCES public.candidate_profiles(id),
  payout_amount DECIMAL(12,2) NOT NULL,
  currency_code TEXT DEFAULT 'EUR',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'paid', 'rejected', 'cancelled')),
  calculation_basis JSONB,
  payment_method TEXT CHECK (payment_method IN ('bank_transfer', 'paypal', 'stripe', 'other')),
  payment_details JSONB,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_placement_fees_application ON public.placement_fees(application_id);
CREATE INDEX IF NOT EXISTS idx_placement_fees_partner ON public.placement_fees(partner_company_id);
CREATE INDEX IF NOT EXISTS idx_placement_fees_status ON public.placement_fees(status);
CREATE INDEX IF NOT EXISTS idx_partner_invoices_company ON public.partner_invoices(partner_company_id);
CREATE INDEX IF NOT EXISTS idx_partner_invoices_status ON public.partner_invoices(status);
CREATE INDEX IF NOT EXISTS idx_partner_invoices_due_date ON public.partner_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_invoice ON public.payment_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_referral_payouts_referrer ON public.referral_payouts(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_payouts_status ON public.referral_payouts(status);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice ON public.invoice_line_items(invoice_id);

-- Enable RLS
ALTER TABLE public.financial_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_billing_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_payouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for financial_settings (Admin only)
CREATE POLICY "Admins can view all financial settings"
  ON public.financial_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage financial settings"
  ON public.financial_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for partner_billing_details
CREATE POLICY "Admins can view all billing details"
  ON public.partner_billing_details FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Partners can view their own billing details"
  ON public.partner_billing_details FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.company_id = partner_billing_details.company_id
    )
  );

CREATE POLICY "Partners can update their own billing details"
  ON public.partner_billing_details FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id = p.id
      WHERE p.id = auth.uid() 
      AND p.company_id = partner_billing_details.company_id
      AND ur.role IN ('partner', 'company_admin')
    )
  );

CREATE POLICY "Partners can insert their own billing details"
  ON public.partner_billing_details FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id = p.id
      WHERE p.id = auth.uid() 
      AND p.company_id = partner_billing_details.company_id
      AND ur.role IN ('partner', 'company_admin')
    )
  );

-- RLS Policies for placement_fees
CREATE POLICY "Admins can view all placement fees"
  ON public.placement_fees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Partners can view their placement fees"
  ON public.placement_fees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.company_id = placement_fees.partner_company_id
    )
  );

CREATE POLICY "Admins can manage placement fees"
  ON public.placement_fees FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for partner_invoices
CREATE POLICY "Admins can view all invoices"
  ON public.partner_invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Partners can view their invoices"
  ON public.partner_invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.company_id = partner_invoices.partner_company_id
    )
  );

CREATE POLICY "Admins can manage invoices"
  ON public.partner_invoices FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for invoice_line_items (inherit from invoice)
CREATE POLICY "Users can view line items for invoices they can see"
  ON public.invoice_line_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_invoices pi
      WHERE pi.id = invoice_line_items.invoice_id
      AND (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = pi.partner_company_id)
      )
    )
  );

CREATE POLICY "Admins can manage line items"
  ON public.invoice_line_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for payment_transactions
CREATE POLICY "Admins can view all transactions"
  ON public.payment_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Partners can view their transactions"
  ON public.payment_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_invoices pi
      JOIN public.profiles p ON p.company_id = pi.partner_company_id
      WHERE pi.id = payment_transactions.invoice_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage transactions"
  ON public.payment_transactions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for referral_payouts
CREATE POLICY "Admins can view all payouts"
  ON public.referral_payouts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view their own payouts"
  ON public.referral_payouts FOR SELECT
  TO authenticated
  USING (referrer_user_id = auth.uid());

CREATE POLICY "Admins can manage payouts"
  ON public.referral_payouts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Function to auto-generate placement fees when application status becomes 'hired'
CREATE OR REPLACE FUNCTION public.auto_generate_placement_fee()
RETURNS TRIGGER AS $$
DECLARE
  v_fee_percentage DECIMAL(5,2);
  v_fee_amount DECIMAL(12,2);
  v_salary DECIMAL(12,2);
  v_company_id UUID;
  v_due_date TIMESTAMPTZ;
BEGIN
  -- Only trigger on status change to 'hired'
  IF NEW.status = 'hired' AND (OLD.status IS NULL OR OLD.status != 'hired') THEN
    
    -- Get the company from the job
    SELECT company_id INTO v_company_id
    FROM public.jobs
    WHERE id = NEW.job_id;
    
    -- Get default fee percentage from financial settings or use 15%
    SELECT COALESCE(default_placement_fee_percentage, 15.00)
    INTO v_fee_percentage
    FROM public.financial_settings
    WHERE company_id = v_company_id
    LIMIT 1;
    
    -- If no settings found, use default
    IF v_fee_percentage IS NULL THEN
      v_fee_percentage := 15.00;
    END IF;
    
    -- Try to get salary from candidate profile or use default
    SELECT COALESCE(
      (SELECT COALESCE(current_salary, expected_salary, 75000)
       FROM public.candidate_profiles
       WHERE id = NEW.candidate_id),
      75000
    ) INTO v_salary;
    
    -- Calculate fee amount
    v_fee_amount := (v_salary * v_fee_percentage / 100);
    
    -- Calculate due date (30 days from hire)
    v_due_date := NEW.updated_at + INTERVAL '30 days';
    
    -- Insert placement fee
    INSERT INTO public.placement_fees (
      application_id,
      job_id,
      candidate_id,
      partner_company_id,
      fee_percentage,
      candidate_salary,
      fee_amount,
      status,
      hired_date,
      payment_due_date,
      created_by
    ) VALUES (
      NEW.id,
      NEW.job_id,
      NEW.candidate_id,
      v_company_id,
      v_fee_percentage,
      v_salary,
      v_fee_amount,
      'pending',
      NEW.updated_at,
      v_due_date,
      auth.uid()
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-generating placement fees
DROP TRIGGER IF EXISTS trigger_auto_generate_placement_fee ON public.applications;
CREATE TRIGGER trigger_auto_generate_placement_fee
  AFTER UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_placement_fee();

-- Function to generate next invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_company_id UUID DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  v_prefix TEXT;
  v_next_number INTEGER;
  v_year TEXT;
  v_invoice_number TEXT;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  -- Get prefix and next number from settings
  SELECT 
    COALESCE(invoice_prefix, 'INV'),
    COALESCE(next_invoice_number, 1)
  INTO v_prefix, v_next_number
  FROM public.financial_settings
  WHERE company_id = p_company_id OR p_company_id IS NULL
  LIMIT 1;
  
  -- If no settings found, use defaults
  IF v_prefix IS NULL THEN
    v_prefix := 'INV';
    v_next_number := 1;
  END IF;
  
  -- Format: INV-2025-0001
  v_invoice_number := v_prefix || '-' || v_year || '-' || LPAD(v_next_number::TEXT, 4, '0');
  
  -- Increment the counter
  UPDATE public.financial_settings
  SET next_invoice_number = next_invoice_number + 1,
      updated_at = now()
  WHERE company_id = p_company_id OR p_company_id IS NULL;
  
  -- If no row was updated, insert default settings
  IF NOT FOUND THEN
    INSERT INTO public.financial_settings (company_id, next_invoice_number)
    VALUES (p_company_id, 2)
    ON CONFLICT (company_id) DO UPDATE
    SET next_invoice_number = public.financial_settings.next_invoice_number + 1;
  END IF;
  
  RETURN v_invoice_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update invoice status based on due date
CREATE OR REPLACE FUNCTION public.update_overdue_invoices()
RETURNS void AS $$
BEGIN
  UPDATE public.partner_invoices
  SET status = 'overdue',
      updated_at = now()
  WHERE status = 'sent'
  AND due_date < CURRENT_DATE
  AND paid_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_financial_settings_updated_at ON public.financial_settings;
CREATE TRIGGER update_financial_settings_updated_at
  BEFORE UPDATE ON public.financial_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_partner_billing_details_updated_at ON public.partner_billing_details;
CREATE TRIGGER update_partner_billing_details_updated_at
  BEFORE UPDATE ON public.partner_billing_details
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_placement_fees_updated_at ON public.placement_fees;
CREATE TRIGGER update_placement_fees_updated_at
  BEFORE UPDATE ON public.placement_fees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_partner_invoices_updated_at ON public.partner_invoices;
CREATE TRIGGER update_partner_invoices_updated_at
  BEFORE UPDATE ON public.partner_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_referral_payouts_updated_at ON public.referral_payouts;
CREATE TRIGGER update_referral_payouts_updated_at
  BEFORE UPDATE ON public.referral_payouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
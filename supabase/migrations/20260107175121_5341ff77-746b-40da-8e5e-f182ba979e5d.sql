-- Vendor Subscriptions Table - Track TQC's operational SaaS and recurring costs
CREATE TABLE public.vendor_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Vendor Info
  vendor_name TEXT NOT NULL,
  vendor_website TEXT,
  vendor_logo_url TEXT,
  category TEXT NOT NULL CHECK (category IN ('Software & SaaS', 'Infrastructure', 'Professional Services', 'Office & Facilities', 'Marketing & Sales', 'HR & Benefits', 'Other')),
  
  -- Contract Details
  contract_start_date DATE NOT NULL,
  contract_end_date DATE,
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'quarterly', 'annually', 'one-time')),
  next_billing_date DATE,
  next_renewal_date DATE,
  auto_renewal BOOLEAN DEFAULT true,
  cancellation_notice_days INTEGER DEFAULT 30,
  
  -- Financials (normalized to monthly)
  monthly_cost NUMERIC(12,2) NOT NULL,
  annual_cost NUMERIC(12,2) GENERATED ALWAYS AS (monthly_cost * 12) STORED,
  currency TEXT DEFAULT 'EUR',
  payment_method TEXT CHECK (payment_method IN ('credit_card', 'bank_transfer', 'revolut', 'ing', 'paypal', 'other')),
  
  -- Usage & Value
  seats_licensed INTEGER,
  seats_used INTEGER,
  department TEXT CHECK (department IN ('Engineering', 'Operations', 'Sales', 'Finance', 'HR', 'Marketing', 'Executive', 'All')),
  primary_owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  business_criticality TEXT DEFAULT 'medium' CHECK (business_criticality IN ('low', 'medium', 'high', 'critical')),
  
  -- Integration (for banking sync)
  expected_bank_reference TEXT,
  linked_bank_account TEXT CHECK (linked_bank_account IN ('revolut', 'ing', 'other')),
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'trial', 'pending')),
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Vendor Subscription History - Track price changes
CREATE TABLE public.vendor_subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.vendor_subscriptions(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL CHECK (change_type IN ('price_change', 'status_change', 'renewal', 'seats_change', 'plan_change')),
  old_value JSONB,
  new_value JSONB,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  change_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Vendor Renewal Reminders
CREATE TABLE public.vendor_renewal_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.vendor_subscriptions(id) ON DELETE CASCADE,
  reminder_date DATE NOT NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('30_days', '14_days', '7_days', '1_day', 'custom')),
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vendor_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_renewal_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admin only for vendor subscriptions
CREATE POLICY "Admins can manage vendor subscriptions" ON public.vendor_subscriptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can view subscription history" ON public.vendor_subscription_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can manage renewal reminders" ON public.vendor_renewal_reminders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Indexes for performance
CREATE INDEX idx_vendor_subscriptions_status ON public.vendor_subscriptions(status);
CREATE INDEX idx_vendor_subscriptions_category ON public.vendor_subscriptions(category);
CREATE INDEX idx_vendor_subscriptions_next_renewal ON public.vendor_subscriptions(next_renewal_date);
CREATE INDEX idx_vendor_subscription_history_subscription ON public.vendor_subscription_history(subscription_id);
CREATE INDEX idx_vendor_renewal_reminders_date ON public.vendor_renewal_reminders(reminder_date) WHERE is_sent = false;

-- Trigger for updated_at
CREATE TRIGGER update_vendor_subscriptions_updated_at
  BEFORE UPDATE ON public.vendor_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
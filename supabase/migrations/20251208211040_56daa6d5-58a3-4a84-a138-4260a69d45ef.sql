
-- Comprehensive Referral System Revamp
-- Phase 1: Database Schema (Fixed - removed invalid finance role)

-- 1. Create referral_revenue_shares table - Track revenue share percentages for users
CREATE TABLE public.referral_revenue_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_type TEXT NOT NULL CHECK (share_type IN ('fixed_percentage', 'per_placement', 'tiered')),
  share_percentage NUMERIC(5,2) CHECK (share_percentage >= 0 AND share_percentage <= 100),
  share_fixed_amount NUMERIC(12,2),
  applies_to TEXT NOT NULL CHECK (applies_to IN ('all_deals', 'self_sourced', 'referred', 'member_referrals')),
  min_deal_value NUMERIC(12,2) DEFAULT 0,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create referral_policies table - Define company-based vs job-based referral policies
CREATE TABLE public.referral_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_type TEXT NOT NULL CHECK (policy_type IN ('company', 'job', 'member')),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  referred_member_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('brought_company', 'brought_job', 'member_referral', 'self_sourced')),
  share_percentage NUMERIC(5,2) DEFAULT 10.00 CHECK (share_percentage >= 0 AND share_percentage <= 100),
  is_active BOOLEAN DEFAULT true,
  claimed_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT policy_type_check CHECK (
    (policy_type = 'company' AND company_id IS NOT NULL AND job_id IS NULL AND referred_member_id IS NULL) OR
    (policy_type = 'job' AND job_id IS NOT NULL AND referred_member_id IS NULL) OR
    (policy_type = 'member' AND referred_member_id IS NOT NULL)
  )
);

-- 3. Create referral_earnings table - Track actual and projected earnings
CREATE TABLE public.referral_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES referral_policies(id) ON DELETE SET NULL,
  revenue_share_id UUID REFERENCES referral_revenue_shares(id) ON DELETE SET NULL,
  placement_id UUID REFERENCES placement_fees(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE SET NULL,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  
  placement_fee_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  referrer_share_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  earned_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  projected_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  weighted_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  stage_probability NUMERIC(5,2) DEFAULT 0,
  
  status TEXT NOT NULL DEFAULT 'projected' CHECK (status IN ('projected', 'qualified', 'pending_payment', 'paid', 'cancelled')),
  qualified_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Add revenue share fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS default_revenue_share_percentage NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS revenue_share_type TEXT DEFAULT 'percentage' CHECK (revenue_share_type IN ('percentage', 'fixed', 'tiered'));

-- 5. Create indexes for performance
CREATE INDEX idx_referral_revenue_shares_user ON referral_revenue_shares(user_id);
CREATE INDEX idx_referral_revenue_shares_active ON referral_revenue_shares(is_active) WHERE is_active = true;
CREATE INDEX idx_referral_policies_referrer ON referral_policies(referrer_id);
CREATE INDEX idx_referral_policies_company ON referral_policies(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX idx_referral_policies_job ON referral_policies(job_id) WHERE job_id IS NOT NULL;
CREATE INDEX idx_referral_policies_member ON referral_policies(referred_member_id) WHERE referred_member_id IS NOT NULL;
CREATE INDEX idx_referral_earnings_referrer ON referral_earnings(referrer_id);
CREATE INDEX idx_referral_earnings_status ON referral_earnings(status);
CREATE INDEX idx_referral_earnings_job ON referral_earnings(job_id) WHERE job_id IS NOT NULL;
CREATE INDEX idx_referral_earnings_company ON referral_earnings(company_id) WHERE company_id IS NOT NULL;

-- 6. Enable RLS
ALTER TABLE public.referral_revenue_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_earnings ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for referral_revenue_shares
CREATE POLICY "Users can view their own revenue shares"
ON referral_revenue_shares FOR SELECT
USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist')
));

CREATE POLICY "Admins can manage all revenue shares"
ON referral_revenue_shares FOR ALL
USING (EXISTS (
  SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
));

-- 8. RLS Policies for referral_policies
CREATE POLICY "Users can view their own policies"
ON referral_policies FOR SELECT
USING (referrer_id = auth.uid() OR referred_member_id = auth.uid() OR EXISTS (
  SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist')
));

CREATE POLICY "Users can create their own policies"
ON referral_policies FOR INSERT
WITH CHECK (referrer_id = auth.uid() OR EXISTS (
  SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Users can update their own policies"
ON referral_policies FOR UPDATE
USING (referrer_id = auth.uid() OR EXISTS (
  SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
));

-- 9. RLS Policies for referral_earnings
CREATE POLICY "Users can view their own earnings"
ON referral_earnings FOR SELECT
USING (referrer_id = auth.uid() OR EXISTS (
  SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist')
));

CREATE POLICY "Admins can manage all earnings"
ON referral_earnings FOR ALL
USING (EXISTS (
  SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
));

-- 10. Create function to auto-attribute jobs to company policies
CREATE OR REPLACE FUNCTION auto_attribute_job_to_company_policy()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO referral_earnings (
    referrer_id,
    policy_id,
    company_id,
    job_id,
    referrer_share_percentage,
    status
  )
  SELECT 
    rp.referrer_id,
    rp.id,
    NEW.company_id,
    NEW.id,
    rp.share_percentage,
    'projected'
  FROM referral_policies rp
  WHERE rp.policy_type = 'company'
    AND rp.company_id = NEW.company_id
    AND rp.is_active = true
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_auto_attribute_job
AFTER INSERT ON jobs
FOR EACH ROW
EXECUTE FUNCTION auto_attribute_job_to_company_policy();

-- 11. Create updated_at triggers
CREATE TRIGGER update_referral_revenue_shares_updated_at
BEFORE UPDATE ON referral_revenue_shares
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_referral_policies_updated_at
BEFORE UPDATE ON referral_policies
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_referral_earnings_updated_at
BEFORE UPDATE ON referral_earnings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 12. Enable realtime for referral tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.referral_earnings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.referral_policies;

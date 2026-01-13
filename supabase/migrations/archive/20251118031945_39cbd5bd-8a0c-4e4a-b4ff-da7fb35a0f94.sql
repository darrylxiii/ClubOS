-- Add fee percentage to partner billing details
ALTER TABLE partner_billing_details
ADD COLUMN IF NOT EXISTS default_fee_percentage DECIMAL(5,2) DEFAULT 20.00;

-- Add check constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'partner_billing_details_default_fee_percentage_check'
  ) THEN
    ALTER TABLE partner_billing_details
    ADD CONSTRAINT partner_billing_details_default_fee_percentage_check 
    CHECK (default_fee_percentage >= 0 AND default_fee_percentage <= 100);
  END IF;
END $$;

-- Create company referrer splits table
CREATE TABLE IF NOT EXISTS company_referrer_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  split_percentage DECIMAL(5,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT company_referrer_splits_split_percentage_check CHECK (split_percentage >= 0 AND split_percentage <= 100),
  CONSTRAINT company_referrer_splits_unique UNIQUE(company_id, referrer_id)
);

ALTER TABLE company_referrer_splits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage company referrer splits" ON company_referrer_splits;
DROP POLICY IF EXISTS "Users can view their referrer splits" ON company_referrer_splits;

CREATE POLICY "Service role can manage company referrer splits"
  ON company_referrer_splits FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view their referrer splits"
  ON company_referrer_splits FOR SELECT
  USING (referrer_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_company_referrer_splits_company ON company_referrer_splits(company_id);
CREATE INDEX IF NOT EXISTS idx_company_referrer_splits_referrer ON company_referrer_splits(referrer_id);

-- Update placement fees
ALTER TABLE placement_fees
ADD COLUMN IF NOT EXISTS fee_percentage_used DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS referrer_splits JSONB;

-- Create projected earnings table
CREATE TABLE IF NOT EXISTS projected_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  estimated_salary DECIMAL(12,2),
  fee_percentage DECIMAL(5,2),
  projected_fee_amount DECIMAL(12,2),
  referrer_splits JSONB,
  confidence_score DECIMAL(3,2) DEFAULT 0.75,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT projected_earnings_application_unique UNIQUE(application_id)
);

ALTER TABLE projected_earnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can view all projected earnings" ON projected_earnings;

CREATE POLICY "Service role can view all projected earnings"
  ON projected_earnings FOR SELECT
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE INDEX IF NOT EXISTS idx_projected_earnings_company ON projected_earnings(company_id);
CREATE INDEX IF NOT EXISTS idx_projected_earnings_candidate ON projected_earnings(candidate_id);

-- Drop old trigger FIRST, then function
DROP TRIGGER IF EXISTS auto_generate_placement_fee_trigger ON applications;
DROP TRIGGER IF EXISTS trigger_auto_generate_placement_fee ON applications;
DROP FUNCTION IF EXISTS auto_generate_placement_fee() CASCADE;

-- Create enhanced function
CREATE OR REPLACE FUNCTION auto_generate_placement_fee()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, extensions
LANGUAGE plpgsql AS $$
DECLARE
  v_fee_percentage DECIMAL(5,2);
  v_fee_amount DECIMAL(12,2);
  v_salary DECIMAL(12,2);
  v_company_id UUID;
  v_splits JSONB;
BEGIN
  IF NEW.status = 'hired' AND (OLD.status IS NULL OR OLD.status != 'hired') THEN
    SELECT company_id INTO v_company_id FROM jobs WHERE id = NEW.job_id;
    
    SELECT COALESCE(pbd.default_fee_percentage, 20.00) INTO v_fee_percentage
    FROM partner_billing_details pbd WHERE pbd.company_id = v_company_id;
    
    SELECT COALESCE(NULLIF(TRIM(current_salary), '')::DECIMAL, 75000.00) INTO v_salary
    FROM candidate_profiles WHERE id = NEW.candidate_id;
    
    v_fee_amount := v_salary * (v_fee_percentage / 100);
    
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'referrer_id', referrer_id,
      'split_percentage', split_percentage,
      'split_amount', ROUND(v_fee_amount * (split_percentage / 100), 2)
    )), '[]'::jsonb) INTO v_splits
    FROM company_referrer_splits
    WHERE company_id = v_company_id AND is_active = true;
    
    INSERT INTO placement_fees (
      application_id, candidate_id, company_id, job_id, hired_date,
      candidate_salary, fee_percentage, fee_amount, fee_percentage_used,
      referrer_splits, status, due_date
    ) VALUES (
      NEW.id, NEW.candidate_id, v_company_id, NEW.job_id, now(),
      v_salary, v_fee_percentage, v_fee_amount, v_fee_percentage,
      v_splits, 'pending', now() + interval '30 days'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_generate_placement_fee_trigger
  AFTER INSERT OR UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION auto_generate_placement_fee();

-- Projection calculation function
CREATE OR REPLACE FUNCTION calculate_projected_earnings()
RETURNS void
SECURITY DEFINER
SET search_path = public, extensions
LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM projected_earnings;
  
  INSERT INTO projected_earnings (
    application_id, candidate_id, company_id, job_id, estimated_salary,
    fee_percentage, projected_fee_amount, referrer_splits, confidence_score
  )
  SELECT 
    a.id, a.candidate_id, j.company_id, a.job_id,
    COALESCE(NULLIF(TRIM(cp.current_salary), '')::DECIMAL, 75000.00),
    COALESCE(pbd.default_fee_percentage, 20.00),
    COALESCE(NULLIF(TRIM(cp.current_salary), '')::DECIMAL, 75000.00) * (COALESCE(pbd.default_fee_percentage, 20.00) / 100),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'referrer_id', crs.referrer_id,
        'split_percentage', crs.split_percentage,
        'split_amount', ROUND(COALESCE(NULLIF(TRIM(cp.current_salary), '')::DECIMAL, 75000.00) * 
          (COALESCE(pbd.default_fee_percentage, 20.00) / 100) * (crs.split_percentage / 100), 2)
      ))
      FROM company_referrer_splits crs
      WHERE crs.company_id = j.company_id AND crs.is_active = true
    ), '[]'::jsonb),
    CASE 
      WHEN a.current_stage_index >= 3 THEN 0.90
      WHEN a.current_stage_index >= 2 THEN 0.70
      WHEN a.current_stage_index >= 1 THEN 0.50
      ELSE 0.30
    END
  FROM applications a
  JOIN jobs j ON j.id = a.job_id
  LEFT JOIN candidate_profiles cp ON cp.id = a.candidate_id
  LEFT JOIN partner_billing_details pbd ON pbd.company_id = j.company_id
  WHERE a.status NOT IN ('rejected', 'hired') AND a.status IS NOT NULL;
END;
$$;
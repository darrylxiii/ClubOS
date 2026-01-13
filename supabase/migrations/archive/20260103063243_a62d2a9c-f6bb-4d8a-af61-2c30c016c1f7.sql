-- Phase 1: Fix Database Schema (Foundation)

-- 1.1 Add Missing Columns to employee_profiles
ALTER TABLE employee_profiles 
ADD COLUMN IF NOT EXISTS commission_tier_id UUID REFERENCES commission_tiers(id),
ADD COLUMN IF NOT EXISTS annual_target NUMERIC DEFAULT 0;

-- 1.2 Add Missing Columns to employee_commissions
ALTER TABLE employee_commissions 
ADD COLUMN IF NOT EXISTS placement_fee_id UUID REFERENCES placement_fees(id),
ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'placement' CHECK (commission_type IN ('placement', 'sourcing', 'strategist_split', 'referral', 'bonus')),
ADD COLUMN IF NOT EXISTS split_percentage NUMERIC DEFAULT 100;

-- 1.3 Add is_active to commission_tiers (if not exists)
ALTER TABLE commission_tiers 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 1.4 Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_employee_profiles_commission_tier ON employee_profiles(commission_tier_id);
CREATE INDEX IF NOT EXISTS idx_employee_commissions_placement_fee ON employee_commissions(placement_fee_id);
CREATE INDEX IF NOT EXISTS idx_employee_commissions_type ON employee_commissions(commission_type);
CREATE INDEX IF NOT EXISTS idx_applications_status_hired ON applications(status) WHERE status = 'hired';
CREATE INDEX IF NOT EXISTS idx_placement_fees_application ON placement_fees(application_id);
CREATE INDEX IF NOT EXISTS idx_placement_fees_status ON placement_fees(status);

-- Add unique constraint on placement_fees.application_id to prevent duplicates
ALTER TABLE placement_fees DROP CONSTRAINT IF EXISTS placement_fees_application_id_key;
ALTER TABLE placement_fees ADD CONSTRAINT placement_fees_application_id_key UNIQUE (application_id);
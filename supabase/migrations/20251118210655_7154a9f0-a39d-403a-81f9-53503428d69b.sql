-- Phase 1: Add placement fee percentage to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS placement_fee_percentage NUMERIC(5,2) 
CHECK (placement_fee_percentage >= 0 AND placement_fee_percentage <= 100);

-- Set default for existing companies (20%)
UPDATE companies 
SET placement_fee_percentage = 20.00 
WHERE placement_fee_percentage IS NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_companies_fee_percentage 
ON companies(placement_fee_percentage) 
WHERE placement_fee_percentage IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN companies.placement_fee_percentage IS 'Percentage of candidate annual salary charged as placement fee (0-100)';
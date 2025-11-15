-- Add is_test_data flag to intelligence tables for easy cleanup
ALTER TABLE company_interactions 
ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT false;

ALTER TABLE company_stakeholders 
ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT false;

-- Add indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_interactions_test_data 
ON company_interactions(is_test_data) WHERE is_test_data = true;

CREATE INDEX IF NOT EXISTS idx_stakeholders_test_data 
ON company_stakeholders(is_test_data) WHERE is_test_data = true;

COMMENT ON COLUMN company_interactions.is_test_data IS 'Marks test/demo data that can be safely removed';
COMMENT ON COLUMN company_stakeholders.is_test_data IS 'Marks test/demo data that can be safely removed';
-- Add retry_count column to company_interactions
ALTER TABLE company_interactions 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_company_interactions_retry 
ON company_interactions(processing_status, retry_count) 
WHERE is_test_data = false;

-- Update existing rows to have retry_count = 0
UPDATE company_interactions 
SET retry_count = 0 
WHERE retry_count IS NULL;
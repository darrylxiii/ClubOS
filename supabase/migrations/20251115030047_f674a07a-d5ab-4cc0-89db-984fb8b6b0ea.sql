-- Add engagement_score column to interaction_participants table
ALTER TABLE interaction_participants 
ADD COLUMN IF NOT EXISTS engagement_score NUMERIC;

-- Ensure test data columns exist with proper indexes
ALTER TABLE company_stakeholders 
ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT false;

ALTER TABLE company_interactions 
ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT false;

-- Add indexes for better performance on test data queries
CREATE INDEX IF NOT EXISTS idx_stakeholders_test_data 
ON company_stakeholders(is_test_data) WHERE is_test_data = true;

CREATE INDEX IF NOT EXISTS idx_interactions_test_data 
ON company_interactions(is_test_data) WHERE is_test_data = true;

-- Add comment for documentation
COMMENT ON COLUMN interaction_participants.engagement_score IS 'Score from 0.0 to 1.0 indicating participant engagement level in the interaction';
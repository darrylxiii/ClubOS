-- Phase 3: Database & RLS Policy Fixes + Phase 4: Error Recovery Table

-- Add metadata columns for tracking processing status
ALTER TABLE company_interactions 
ADD COLUMN IF NOT EXISTS insights_extracted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'));

-- Create intelligence processing errors table for Phase 4
CREATE TABLE IF NOT EXISTS intelligence_processing_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('interaction', 'company', 'stakeholder')),
  entity_id UUID NOT NULL,
  function_name TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance (Phase 3)
CREATE INDEX IF NOT EXISTS idx_interaction_insights_interaction_id ON interaction_insights(interaction_id);
CREATE INDEX IF NOT EXISTS idx_interaction_ml_features_entity ON interaction_ml_features(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_company_interactions_test_data ON company_interactions(is_test_data);
CREATE INDEX IF NOT EXISTS idx_company_interactions_company_date ON company_interactions(company_id, interaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_company_interactions_processing_status ON company_interactions(processing_status) WHERE processing_status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS idx_intelligence_errors_unresolved ON intelligence_processing_errors(entity_type, entity_id) WHERE resolved = false;

-- Enable RLS on new table
ALTER TABLE intelligence_processing_errors ENABLE ROW LEVEL SECURITY;

-- RLS policy for errors table (admins and strategists can view)
CREATE POLICY "Admins and strategists can view processing errors"
ON intelligence_processing_errors FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'strategist')
  )
);

-- Enable realtime for Phase 5
ALTER PUBLICATION supabase_realtime ADD TABLE interaction_insights;
ALTER PUBLICATION supabase_realtime ADD TABLE interaction_ml_features;
ALTER PUBLICATION supabase_realtime ADD TABLE intelligence_processing_errors;
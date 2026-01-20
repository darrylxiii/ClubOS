-- Item 14: Lead Score History Table
CREATE TABLE public.prospect_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES crm_prospects(id) ON DELETE CASCADE,
  previous_score INTEGER NOT NULL DEFAULT 0,
  new_score INTEGER NOT NULL,
  change_reason TEXT NOT NULL,
  triggered_by TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_prospect_score_history_prospect ON prospect_score_history(prospect_id, created_at DESC);
CREATE INDEX idx_prospect_score_history_created ON prospect_score_history(created_at DESC);

-- RLS Policies
ALTER TABLE prospect_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prospect_score_history_owner_select" ON prospect_score_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM crm_prospects p 
      WHERE p.id = prospect_score_history.prospect_id 
      AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "prospect_score_history_insert" ON prospect_score_history
  FOR INSERT WITH CHECK (true);

-- Trigger function to auto-log score changes
CREATE OR REPLACE FUNCTION log_prospect_score_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.lead_score IS DISTINCT FROM NEW.lead_score THEN
    INSERT INTO prospect_score_history (
      prospect_id,
      previous_score,
      new_score,
      change_reason,
      triggered_by,
      metadata
    ) VALUES (
      NEW.id,
      COALESCE(OLD.lead_score, 0),
      COALESCE(NEW.lead_score, 0),
      COALESCE(
        NEW.custom_fields->>'score_change_reason',
        'Score updated'
      ),
      COALESCE(
        NEW.custom_fields->>'score_triggered_by',
        'system'
      ),
      jsonb_build_object(
        'engagement_score', NEW.engagement_score,
        'emails_opened', NEW.emails_opened,
        'emails_clicked', NEW.emails_clicked,
        'emails_replied', NEW.emails_replied
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on crm_prospects
CREATE TRIGGER trigger_prospect_score_change
  AFTER UPDATE OF lead_score ON crm_prospects
  FOR EACH ROW
  EXECUTE FUNCTION log_prospect_score_change();

-- Item 10: Storage bucket for contract documents (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contract-documents', 
  'contract-documents', 
  false,
  10485760,
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for contract documents
CREATE POLICY "contract_docs_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'contract-documents' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "contract_docs_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'contract-documents' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "contract_docs_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'contract-documents' AND
    auth.uid() IS NOT NULL
  );
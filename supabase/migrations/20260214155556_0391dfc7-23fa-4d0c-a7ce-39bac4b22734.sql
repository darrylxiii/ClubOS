-- Add unique constraint on external_id for upsert deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_email_replies_external_id 
  ON crm_email_replies(external_id) 
  WHERE external_id IS NOT NULL;
-- Add expiry and archiving columns to candidate_documents
ALTER TABLE candidate_documents 
ADD COLUMN IF NOT EXISTS expiry_date DATE,
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS uploaded_by_role TEXT;

-- Drop and recreate function to archive expired documents
DROP FUNCTION IF EXISTS archive_expired_documents();

CREATE FUNCTION archive_expired_documents()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE candidate_documents
  SET archived = TRUE,
      archived_at = NOW()
  WHERE expiry_date < CURRENT_DATE
    AND archived = FALSE
    AND uploaded_by_role IN ('admin', 'partner', 'strategist');
END;
$$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_candidate_documents_expiry ON candidate_documents(expiry_date) WHERE archived = FALSE;

-- Add 'fathom' to source_type constraint
ALTER TABLE meeting_recordings_extended
  DROP CONSTRAINT IF EXISTS meeting_recordings_extended_source_type_check;
ALTER TABLE meeting_recordings_extended
  ADD CONSTRAINT meeting_recordings_extended_source_type_check
  CHECK (source_type = ANY (ARRAY[
    'tqc_meeting','live_hub','conversation_call','fathom'
  ]));

-- Track external source IDs for deduplication
ALTER TABLE meeting_recordings_extended
  ADD COLUMN IF NOT EXISTS external_source_id text;

-- Prevent duplicate Fathom imports
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_fathom_source
  ON meeting_recordings_extended (external_source_id)
  WHERE source_type = 'fathom' AND external_source_id IS NOT NULL;

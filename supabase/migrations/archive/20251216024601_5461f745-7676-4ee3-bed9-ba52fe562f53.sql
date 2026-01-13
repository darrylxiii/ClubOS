-- Add Instantly sync columns to crm_suppression_list
ALTER TABLE crm_suppression_list 
ADD COLUMN IF NOT EXISTS instantly_entry_id TEXT,
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Add index for Instantly entry lookup
CREATE INDEX IF NOT EXISTS idx_crm_suppression_instantly_id 
ON crm_suppression_list(instantly_entry_id) WHERE instantly_entry_id IS NOT NULL;

-- Add index for sync status
CREATE INDEX IF NOT EXISTS idx_crm_suppression_sync_status 
ON crm_suppression_list(sync_status) WHERE sync_status IS NOT NULL;

-- Add comment
COMMENT ON COLUMN crm_suppression_list.instantly_entry_id IS 'Instantly block list entry ID for bi-directional sync';
COMMENT ON COLUMN crm_suppression_list.sync_status IS 'Sync status: pending, synced, error';
COMMENT ON COLUMN crm_suppression_list.last_synced_at IS 'Last sync timestamp with Instantly';
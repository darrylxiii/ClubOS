-- Add missing stage_updated_at column to applications table
ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS stage_updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create trigger function to auto-update stage_updated_at when stage changes
CREATE OR REPLACE FUNCTION update_stage_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_stage_index IS DISTINCT FROM OLD.current_stage_index
     OR NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.stage_updated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on applications table
DROP TRIGGER IF EXISTS trg_update_stage_timestamp ON applications;
CREATE TRIGGER trg_update_stage_timestamp
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION update_stage_timestamp();

-- Backfill existing records: set stage_updated_at = updated_at
UPDATE applications SET stage_updated_at = updated_at WHERE stage_updated_at IS NULL;
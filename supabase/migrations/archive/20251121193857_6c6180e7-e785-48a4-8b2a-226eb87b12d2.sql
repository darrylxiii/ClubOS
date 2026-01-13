-- Phase 1: Fix Critical Production Database Errors

-- 1. Add missing icon column to quantum_achievements table
ALTER TABLE quantum_achievements 
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '🏆';

-- Update comment
COMMENT ON COLUMN quantum_achievements.icon IS 'Icon emoji or URL for the achievement display';

-- 2. Add company_name to jobs table for performance (denormalized for faster queries)
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Backfill existing jobs with company name
UPDATE jobs j
SET company_name = c.name
FROM companies c
WHERE j.company_id = c.id
AND j.company_name IS NULL;

-- Create trigger to auto-update company_name when company changes
CREATE OR REPLACE FUNCTION sync_job_company_name()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.company_id IS NOT NULL THEN
      SELECT name INTO NEW.company_name
      FROM companies
      WHERE id = NEW.company_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER job_company_name_sync
  BEFORE INSERT OR UPDATE OF company_id ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION sync_job_company_name();

-- 3. Ensure bookings table has reminder_sent column
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false;

-- Add index for reminder query optimization
CREATE INDEX IF NOT EXISTS idx_bookings_reminder_lookup 
ON bookings(status, reminder_sent, scheduled_start) 
WHERE status = 'confirmed' AND reminder_sent = false;

COMMENT ON INDEX idx_bookings_reminder_lookup IS 'Optimizes booking reminder queries';

-- 4. Fix any existing NULL values
UPDATE quantum_achievements SET icon = '🏆' WHERE icon IS NULL;
UPDATE bookings SET reminder_sent = false WHERE reminder_sent IS NULL;
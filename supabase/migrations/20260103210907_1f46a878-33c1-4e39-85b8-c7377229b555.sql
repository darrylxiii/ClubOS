-- Rename original_sourced_by to added_by for clarity
-- "Added by" = who entered the candidate
-- "Sourced by" = who gets credit/commission

-- Rename columns in placement_fees
ALTER TABLE placement_fees RENAME COLUMN original_sourced_by TO added_by;
ALTER TABLE placement_fees ADD COLUMN IF NOT EXISTS added_by_name TEXT;

-- Rename columns in job_closures
ALTER TABLE job_closures RENAME COLUMN original_sourced_by TO added_by;
ALTER TABLE job_closures ADD COLUMN IF NOT EXISTS added_by_name TEXT;

-- Update Claudia Bruno's record with added_by_name
UPDATE placement_fees
SET added_by_name = 'Sebastiaan brouwer'
WHERE added_by = 'f1f446e1-b186-4a35-9daf-cc0bcd10b907';
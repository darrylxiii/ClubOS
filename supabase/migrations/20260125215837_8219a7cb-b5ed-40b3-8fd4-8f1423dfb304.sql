-- Remove duplicate FK constraint that causes the 23503 error
-- Keep applications_candidate_id_fkey (SET NULL behavior)
ALTER TABLE applications 
DROP CONSTRAINT IF EXISTS fk_applications_candidate_profiles;
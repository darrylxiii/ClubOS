-- Remove duplicate foreign key constraint on applications.candidate_id
-- Keep the one with CASCADE behavior, remove the one with SET NULL
ALTER TABLE public.applications 
DROP CONSTRAINT IF EXISTS applications_candidate_id_fkey;

-- Verify the remaining constraint is correct
-- (fk_applications_candidate_profiles with ON DELETE CASCADE should remain)
-- Phase 5: Audit Fixes - Database Schema Corrections

-- 1. Add unique constraint on recruitment_candidate_scores for upsert operations
-- First, clean up any potential duplicates
DELETE FROM public.recruitment_candidate_scores a
    USING public.recruitment_candidate_scores b
WHERE a.id < b.id 
    AND a.candidate_id = b.candidate_id 
    AND a.project_config_id = b.project_config_id;

-- Now add the unique constraint
ALTER TABLE public.recruitment_candidate_scores
ADD CONSTRAINT unique_candidate_project_score 
UNIQUE (candidate_id, project_config_id);

-- 2. Add rejection_note column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'recruitment_candidate_scores' 
        AND column_name = 'rejection_note'
    ) THEN
        ALTER TABLE public.recruitment_candidate_scores
        ADD COLUMN rejection_note TEXT;
    END IF;
END $$;

-- 3. Add full_name computed column or ensure it's populated
-- Many queries use full_name while normalize-candidate uses first_name/last_name
DO $$
BEGIN
    -- If full_name doesn't exist, add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'candidate_profiles' 
        AND column_name = 'full_name'
    ) THEN
        ALTER TABLE public.candidate_profiles
        ADD COLUMN full_name TEXT GENERATED ALWAYS AS (
            COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')
        ) STORED;
    END IF;
END $$;

-- 4. Add index on search_queue for performance
CREATE INDEX IF NOT EXISTS idx_search_queue_status 
ON public.recruitment_search_queue(status, created_at);

CREATE INDEX IF NOT EXISTS idx_candidate_scores_config 
ON public.recruitment_candidate_scores(project_config_id, human_feedback);


-- Phase 1: Add assessment_breakdown and assessment_computed_at to candidate_profiles
ALTER TABLE public.candidate_profiles 
  ADD COLUMN IF NOT EXISTS assessment_breakdown JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS assessment_computed_at TIMESTAMPTZ DEFAULT NULL;

-- Add index for quick lookup of stale assessments
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_assessment_stale 
  ON public.candidate_profiles (assessment_computed_at) 
  WHERE assessment_computed_at IS NULL;

COMMENT ON COLUMN public.candidate_profiles.assessment_breakdown IS 'Computed multi-dimensional assessment: {skills_match, experience, engagement, culture_fit, salary_match, location_match, each with score and confidence}';
COMMENT ON COLUMN public.candidate_profiles.assessment_computed_at IS 'When assessment_breakdown was last computed';

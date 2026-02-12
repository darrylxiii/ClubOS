
-- Add enrichment columns to candidate_profiles
ALTER TABLE public.candidate_profiles
  ADD COLUMN IF NOT EXISTS public_mentions jsonb,
  ADD COLUMN IF NOT EXISTS portfolio_data jsonb,
  ADD COLUMN IF NOT EXISTS candidate_brief jsonb,
  ADD COLUMN IF NOT EXISTS skill_verification jsonb,
  ADD COLUMN IF NOT EXISTS enrichment_sources text[];


ALTER TABLE public.candidate_profiles 
ADD COLUMN IF NOT EXISTS ai_enrichment_data jsonb DEFAULT NULL;

COMMENT ON COLUMN public.candidate_profiles.ai_enrichment_data IS 'AI-generated enrichment data: key_strengths, recommended_roles, enriched_at, model';

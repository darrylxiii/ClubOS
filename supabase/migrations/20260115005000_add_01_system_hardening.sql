-- ADD-01: System Hardening & Intelligence Layer
-- Applies to: Universal Recruitment Engine v2

-- 1. Candidate DNA (Role-Agnostic Core Profile)
-- Stores immutable traits like 'seniority_curve', 'execution_vs_strategy', etc.
ALTER TABLE public.candidate_profiles 
ADD COLUMN IF NOT EXISTS core_dna JSONB DEFAULT '{}'::jsonb;

-- 2. Rejection Intelligence & Human Overrides
-- Extends the scoring table to capture structured rejection data and manual overrides.
ALTER TABLE public.recruitment_candidate_scores
ADD COLUMN IF NOT EXISTS rejection_reason_tag TEXT, -- enum: 'skill_gap', 'culture_risk', 'comp_mismatch', etc.
ADD COLUMN IF NOT EXISTS rejection_note TEXT,
ADD COLUMN IF NOT EXISTS human_override_action TEXT CHECK (human_override_action IN ('approve', 'reject')),
ADD COLUMN IF NOT EXISTS human_override_reason TEXT,
ADD COLUMN IF NOT EXISTS human_override_at TIMESTAMP WITH TIME ZONE;

-- 3. Project Config Client Bias
-- We might need to ensure the JSONB schema supports 'client_bias', but database-wise, 
-- 'config' column is already JSONB, so no DDL needed for that specific field.
-- However, we can add a comment or check constraint if we wanted to be very strict, 
-- but for now we rely on the JSON Schema validation in the Agent.

-- 4. Create Index for Analytics
CREATE INDEX IF NOT EXISTS idx_recruitment_scores_rejection_tag 
ON public.recruitment_candidate_scores(rejection_reason_tag);

CREATE INDEX IF NOT EXISTS idx_recruitment_scores_override 
ON public.recruitment_candidate_scores(human_override_action);

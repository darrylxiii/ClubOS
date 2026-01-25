-- Meeting Intelligence → ML/RAG Integration
-- Add indexes for meeting entity types in intelligence_embeddings

-- Add partial indexes for meeting-related entity types
CREATE INDEX IF NOT EXISTS idx_intel_embed_meeting_candidate 
ON intelligence_embeddings(entity_id) 
WHERE entity_type = 'meeting_candidate';

CREATE INDEX IF NOT EXISTS idx_intel_embed_meeting_job 
ON intelligence_embeddings(entity_id) 
WHERE entity_type = 'meeting_job';

CREATE INDEX IF NOT EXISTS idx_intel_embed_meeting_interviewer 
ON intelligence_embeddings(entity_id) 
WHERE entity_type = 'meeting_interviewer';

-- Add interview performance columns to ml_training_data
ALTER TABLE ml_training_data 
ADD COLUMN IF NOT EXISTS interview_performance_score REAL,
ADD COLUMN IF NOT EXISTS interview_communication_score REAL,
ADD COLUMN IF NOT EXISTS interview_technical_score REAL,
ADD COLUMN IF NOT EXISTS interview_cultural_fit_score REAL,
ADD COLUMN IF NOT EXISTS interview_hiring_recommendation TEXT,
ADD COLUMN IF NOT EXISTS interview_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS interview_red_flags_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS interview_green_flags_count INTEGER DEFAULT 0;

-- Add embedding_generated flag to meeting_recordings_extended to track processed recordings
ALTER TABLE meeting_recordings_extended 
ADD COLUMN IF NOT EXISTS embeddings_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS embeddings_generated_at TIMESTAMPTZ;

-- Update table comment to document entity types
COMMENT ON TABLE intelligence_embeddings IS 
'RAG storage with vector embeddings. Entity types: company_dna, candidate, job, interaction, communication, meeting_candidate, meeting_job, meeting_interviewer';
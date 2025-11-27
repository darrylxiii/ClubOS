-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding columns to candidate_profiles
ALTER TABLE candidate_profiles 
ADD COLUMN IF NOT EXISTS profile_embedding vector(1536),
ADD COLUMN IF NOT EXISTS embedding_generated_at timestamptz;

-- Add embedding columns to jobs
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS job_embedding vector(1536),
ADD COLUMN IF NOT EXISTS embedding_generated_at timestamptz;

-- Add embedding columns to knowledge_base_articles
ALTER TABLE knowledge_base_articles 
ADD COLUMN IF NOT EXISTS content_embedding vector(1536),
ADD COLUMN IF NOT EXISTS embedding_generated_at timestamptz;

-- Add embedding columns to company_interactions
ALTER TABLE company_interactions 
ADD COLUMN IF NOT EXISTS interaction_embedding vector(1536),
ADD COLUMN IF NOT EXISTS embedding_generated_at timestamptz;

-- Create indexes for vector similarity search (using HNSW for performance)
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_embedding 
ON candidate_profiles USING hnsw (profile_embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_jobs_embedding 
ON jobs USING hnsw (job_embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_embedding 
ON knowledge_base_articles USING hnsw (content_embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_company_interactions_embedding 
ON company_interactions USING hnsw (interaction_embedding vector_cosine_ops);

-- Create a function to calculate cosine similarity (helper for queries)
CREATE OR REPLACE FUNCTION cosine_similarity(a vector, b vector)
RETURNS float
LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE
AS $$
BEGIN
  RETURN 1 - (a <=> b);
END;
$$;

COMMENT ON COLUMN candidate_profiles.profile_embedding IS 'OpenAI text-embedding-3-small (1536 dimensions) of candidate profile text';
COMMENT ON COLUMN jobs.job_embedding IS 'OpenAI text-embedding-3-small (1536 dimensions) of job description';
COMMENT ON COLUMN knowledge_base_articles.content_embedding IS 'OpenAI text-embedding-3-small (1536 dimensions) of article content';
COMMENT ON COLUMN company_interactions.interaction_embedding IS 'OpenAI text-embedding-3-small (1536 dimensions) of interaction context';
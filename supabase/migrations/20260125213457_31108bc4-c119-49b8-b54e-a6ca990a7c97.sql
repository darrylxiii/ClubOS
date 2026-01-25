-- Add embedding column to intelligence_embeddings table
ALTER TABLE intelligence_embeddings 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Add updated_at column for upsert operations
ALTER TABLE intelligence_embeddings 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create unique constraint for upsert
ALTER TABLE intelligence_embeddings 
ADD CONSTRAINT intelligence_embeddings_entity_unique UNIQUE (entity_type, entity_id);

-- Create HNSW index for fast similarity search
CREATE INDEX IF NOT EXISTS idx_intelligence_embeddings_vector 
ON intelligence_embeddings 
USING hnsw (embedding vector_cosine_ops);
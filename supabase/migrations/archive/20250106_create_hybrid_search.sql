-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Enable the pg_trgm extension for keyword search (if needed, though we use tsvector for fulltext)
create extension if not exists pg_trgm;

-- Add a full-text search column to intelligence_embeddings if it doesn't exist
alter table intelligence_embeddings
add column if not exists fts tsvector generated always as (to_tsvector('english', content)) stored;

-- Create an index for the full-text search column
create index if not exists intelligence_embeddings_fts_idx on intelligence_embeddings using gin (fts);

-- Create a function for Hybrid Search
-- This combines cosine similarity (vector) with full-text search (keyword)
create or replace function search_universal_context(
  query_text text,
  query_embedding vector(1536), -- OpenAI Small model dimension
  match_threshold float,
  match_count int,
  full_text_weight float default 1.0, -- Weight for keyword matches (e.g. 1.0)
  semantic_weight float default 1.0   -- Weight for vector matches (e.g. 1.0)
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float,
  combined_score float
)
language plpgsql
as $$
begin
  return query
  select
    intelligence_embeddings.id,
    intelligence_embeddings.content,
    intelligence_embeddings.metadata,
    1 - (intelligence_embeddings.embedding <=> query_embedding) as similarity,
    -- Hybrid Score: (Vector Similarity * Weight) + (Full Text Rank * Weight)
    (
      (1 - (intelligence_embeddings.embedding <=> query_embedding)) * semantic_weight +
      ts_rank(intelligence_embeddings.fts, to_tsquery('english', query_text)) * full_text_weight
    ) as combined_score
  from intelligence_embeddings
  where 1 - (intelligence_embeddings.embedding <=> query_embedding) > match_threshold
  or ts_rank(intelligence_embeddings.fts, to_tsquery('english', query_text)) > 0
  order by combined_score desc
  limit match_count;
end;
$$;

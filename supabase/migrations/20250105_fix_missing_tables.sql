
-- Enable vector extension
create extension if not exists vector;

create table if not exists intelligence_embeddings (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  metadata jsonb default '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz default now()
);

-- Note: fts column is added in 20250106_create_hybrid_search.sql

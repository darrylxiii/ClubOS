-- Create RPC function for efficient semantic search
CREATE OR REPLACE FUNCTION semantic_search_candidates(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  current_title text,
  current_company text,
  bio text,
  location text,
  similarity_score float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.id,
    cp.user_id,
    cp.full_name,
    cp.current_title,
    cp.current_company,
    cp.bio,
    cp.location,
    1 - (cp.profile_embedding <=> query_embedding) as similarity_score
  FROM candidate_profiles cp
  WHERE cp.profile_embedding IS NOT NULL
    AND 1 - (cp.profile_embedding <=> query_embedding) >= match_threshold
  ORDER BY cp.profile_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create RPC function for job semantic search
CREATE OR REPLACE FUNCTION semantic_search_jobs(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title text,
  department text,
  location text,
  description text,
  requirements text,
  similarity_score float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.id,
    j.title,
    j.department,
    j.location,
    j.description,
    j.requirements,
    1 - (j.job_embedding <=> query_embedding) as similarity_score
  FROM jobs j
  WHERE j.job_embedding IS NOT NULL
    AND 1 - (j.job_embedding <=> query_embedding) >= match_threshold
  ORDER BY j.job_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create RPC function for knowledge base semantic search
CREATE OR REPLACE FUNCTION semantic_search_knowledge(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  category text,
  tags text[],
  similarity_score float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    k.id,
    k.title,
    k.content,
    k.category,
    k.tags,
    1 - (k.content_embedding <=> query_embedding) as similarity_score
  FROM knowledge_base_articles k
  WHERE k.content_embedding IS NOT NULL
    AND 1 - (k.content_embedding <=> query_embedding) >= match_threshold
  ORDER BY k.content_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create function to get embedding statistics
CREATE OR REPLACE FUNCTION get_embedding_stats()
RETURNS TABLE (
  entity_type text,
  total_records bigint,
  with_embeddings bigint,
  percentage numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'candidates' as entity_type,
    COUNT(*) as total_records,
    COUNT(profile_embedding) as with_embeddings,
    ROUND((COUNT(profile_embedding)::numeric / NULLIF(COUNT(*), 0) * 100), 2) as percentage
  FROM candidate_profiles
  UNION ALL
  SELECT 
    'jobs' as entity_type,
    COUNT(*) as total_records,
    COUNT(job_embedding) as with_embeddings,
    ROUND((COUNT(job_embedding)::numeric / NULLIF(COUNT(*), 0) * 100), 2) as percentage
  FROM jobs
  UNION ALL
  SELECT 
    'knowledge_articles' as entity_type,
    COUNT(*) as total_records,
    COUNT(content_embedding) as with_embeddings,
    ROUND((COUNT(content_embedding)::numeric / NULLIF(COUNT(*), 0) * 100), 2) as percentage
  FROM knowledge_base_articles
  UNION ALL
  SELECT 
    'interactions' as entity_type,
    COUNT(*) as total_records,
    COUNT(interaction_embedding) as with_embeddings,
    ROUND((COUNT(interaction_embedding)::numeric / NULLIF(COUNT(*), 0) * 100), 2) as percentage
  FROM company_interactions;
END;
$$;